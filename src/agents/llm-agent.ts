import OpenAI from 'openai';
import { RAGService } from './rag-service';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class InventoryLLMAgent {
  private openai: OpenAI;
  private ragService: RAGService;
  private assistantId: string | null = null;
  private threadId: string | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
- search_inventory: Search and analyze inventory using natural language queries

For ANY inventory questions (counts, analysis, specific products, etc.), always use search_inventory.`,
      tools: [
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



    if (name === 'search_inventory') {
      const query = args.query;
      console.log(`🔍 Delegating search to RAG agent: "${query}"`);
      const results = await this.ragService.searchProducts(query);

      // Check if sync is required
      if (results.startsWith('SYNC_REQUIRED:')) {
        return 'Please sync inventory first using the MCP server sync_inventory tool.';
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
