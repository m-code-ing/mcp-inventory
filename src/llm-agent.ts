import OpenAI from 'openai';
import { InventoryService } from './inventory-service';
import { ExcelExporter } from './excel';
import { RAGService } from './rag-service';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class InventoryLLMAgent {
  private openai: OpenAI;
  private inventoryService: InventoryService;
  private excelExporter: ExcelExporter;
  private ragService: RAGService;
  private assistantId: string | null = null;
  private threadId: string | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.inventoryService = new InventoryService(process.env.SHOPIFY_STORE!, process.env.SHOPIFY_ACCESS_TOKEN!);
    this.excelExporter = new ExcelExporter();
    this.ragService = new RAGService();
  }

  private async initializeAssistant(): Promise<void> {
    if (this.assistantId) return;

    // List existing assistants and clean up old main assistants
    console.log('🧹 Cleaning up old main assistants...');
    const assistants = await this.openai.beta.assistants.list();
    const mainAssistants = assistants.data.filter(
      (a) => a.name === 'Inventory Management Assistant' && a.tools?.some((tool) => tool.type === 'function')
    );

    if (mainAssistants.length > 0) {
      console.log(`🗑️ Found ${mainAssistants.length} old main assistants, keeping one and deleting others`);
      // Keep the first one, delete the rest
      this.assistantId = mainAssistants[0].id;
      for (let i = 1; i < mainAssistants.length; i++) {
        await this.openai.beta.assistants.delete(mainAssistants[i].id);
        console.log(`🗑️ Deleted main assistant: ${mainAssistants[i].id}`);
      }
      console.log(`✅ Reusing existing main assistant: ${this.assistantId}`);
      return;
    }

    // Create new assistant if none exists
    console.log('🤖 Creating new main assistant...');
    const assistant = await this.openai.beta.assistants.create({
      name: 'Inventory Management Assistant',
      instructions: `You are an inventory management assistant for a Shopify store. Your primary role is to fetch and sync inventory data. For any questions about products, inventory analysis, or searches, always use the search_inventory tool which provides accurate semantic search results.

Available tools:
- sync_inventory: Fetch fresh inventory data from Shopify and index for search
- search_inventory: Search and analyze inventory using natural language queries

For ANY inventory questions (counts, analysis, specific products, etc.), always use search_inventory.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'sync_inventory',
            description: 'Fetch fresh inventory data from Shopify and save to timestamped Excel file',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'search_inventory',
            description:
              'Search and analyze inventory using natural language queries - handles all product questions, counts, analysis, and searches',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'Any inventory question or search query (e.g., "how many products?", "red shirts", "expensive items", "low stock products", "total value")',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10)',
                },
              },
              required: ['query'],
            },
          },
        },
      ],
      model: 'gpt-4',
    });

    this.assistantId = assistant.id;
    console.log(`✅ Main assistant created: ${assistant.id}`);
  }

  private async initializeThread(): Promise<void> {
    if (this.threadId) return;

    const thread = await this.openai.beta.threads.create();
    this.threadId = thread.id;
  }

  private async executeTool(name: string, args: any): Promise<string> {
    console.log('\n' + '-'.repeat(50));
    console.log('🔧 MAIN AGENT TOOL EXECUTION');
    console.log('-'.repeat(50));
    console.log(`🚀 Executing tool: ${name}`);
    console.log(`📝 Arguments:`, args);

    if (name === 'sync_inventory') {
      const dir = './shopify/inventory';
      const supported = new Set(['.md', '.txt', '.json']); // formats your RAG uses

      // 1) List files with mtimes (ignore subdirs)
      const entries = fs
        .readdirSync(dir)
        .map((fn) => {
          const fp = path.join(dir, fn);
          const st = fs.statSync(fp);
          return st.isFile() ? { fp, mtimeMs: st.mtimeMs } : null;
        })
        .filter(Boolean) as { fp: string; mtimeMs: number }[];

      if (entries.length === 0) {
        console.log('🔄 No files found. Fetching fresh inventory...');
        const result = await this.inventoryService.syncInventory();
        await this.ragService.updateInventory(result.filePath);
        return `Successfully synced ${result.productCount} products and updated search index`;
      }

      // 2) Sort by mtime desc; keep latest, delete the rest
      entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
      const latest = entries[0];
      const toDelete = entries.slice(1);

      console.log('🗑️ Cleaning up old inventory files (keeping the latest)...');
      for (const e of toDelete) {
        try {
          fs.unlinkSync(e.fp);
        } catch {}
      }

      // 3) Check age of latest
      const oneDayMs = 24 * 60 * 60 * 1000;
      const ageMs = Date.now() - latest.mtimeMs;

      if (ageMs < oneDayMs) {
        console.log('📅 Using existing inventory (less than 1 day old)');
        // pick the latest **supported** file (could be latest itself or none)
        const latestExt = path.extname(latest.fp).toLowerCase();
        const usePath = supported.has(latestExt)
          ? latest.fp
          : // fallback: scan again for most recent supported file (if any)
            entries.find((e) => supported.has(path.extname(e.fp).toLowerCase()))?.fp;

        if (usePath) {
          await this.ragService.updateInventory(usePath);
        } else {
          console.log('⚠️ No supported inventory file found to index (need .md/.txt/.json)');
        }

        const hours = Math.round(ageMs / (60 * 60 * 1000));
        return `Using existing inventory data (${hours} hours old)`;
      }

      // 4) Latest is stale → sync fresh, index it, then remove the old latest
      console.log('🔄 Fetching fresh inventory data...');
      const result = await this.inventoryService.syncInventory();
      await this.ragService.updateInventory(result.filePath);

      try {
        fs.unlinkSync(latest.fp);
      } catch {} // keep directory clean (optional)

      return `Successfully synced ${result.productCount} products and updated search index`;
    }

    if (name === 'search_inventory') {
      const query = args.query;
      console.log(`🔍 Delegating search to RAG agent: "${query}"`);
      const results = await this.ragService.searchProducts(query);

      // Check if sync is required
      if (results.startsWith('SYNC_REQUIRED:')) {
        console.log('🔄 Auto-syncing inventory...');
        await this.executeTool('sync_inventory', {});
        console.log('✅ Sync completed, retrying search...');

        // Retry the search
        const retryResults = await this.ragService.searchProducts(query);
        console.log('\n' + '-'.repeat(50));
        console.log('✅ MAIN AGENT TOOL COMPLETED');
        console.log('-'.repeat(50));
        return retryResults;
      }

      console.log('\n' + '-'.repeat(50));
      console.log('✅ MAIN AGENT TOOL COMPLETED');
      console.log('-'.repeat(50));
      return results;
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  async chat(message: string): Promise<string> {
    try {
      await this.initializeAssistant();
      await this.initializeThread();

      // Add message to thread
      await this.openai.beta.threads.messages.create(this.threadId!, {
        role: 'user',
        content: message,
      });

      // Create and poll run
      const run = await this.openai.beta.threads.runs.createAndPoll(this.threadId!, {
        assistant_id: this.assistantId!,
      });

      // Handle tool calls
      if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
        const toolOutputs = [];

        for (const toolCall of run.required_action.submit_tool_outputs.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const result = await this.executeTool(toolCall.function.name, args);

          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: result,
          });
        }

        // Submit tool outputs and poll until completion
        const finalRun = await this.openai.beta.threads.runs.submitToolOutputsAndPoll(run.id, {
          thread_id: this.threadId!,
          tool_outputs: toolOutputs,
        });

        if (finalRun.status === 'completed') {
          const messages = await this.openai.beta.threads.messages.list(this.threadId!);
          return messages.data[0].content[0].type === 'text'
            ? messages.data[0].content[0].text.value
            : 'No response generated.';
        }

        return `Final run completed with status: ${finalRun.status}`;
      }

      if (run.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(this.threadId!);
        return messages.data[0].content[0].type === 'text'
          ? messages.data[0].content[0].text.value
          : 'No response generated.';
      }

      return `Run completed with status: ${run.status}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
}
