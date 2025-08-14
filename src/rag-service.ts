import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { Product } from './types';

export class RAGService {
  private openai: OpenAI;
  private vectorStoreId: string | null = null;
  private assistantId: string | null = null;
  private threadId: string | null = null; // 🔴 persist a single thread

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    // Optional: restore a saved thread across process restarts
    const fp = path.join(process.cwd(), '.rag.thread');
    if (fs.existsSync(fp)) this.threadId = fs.readFileSync(fp, 'utf8').trim() || null;
  }

  private async getOrCreateAssistant(): Promise<string> {
    if (this.assistantId) return this.assistantId;
    const assistants = await this.openai.beta.assistants.list();
    const rag = assistants.data.filter(
      (a) => a.name === 'Product Search Assistant' && a.tools?.some((t) => t.type === 'file_search')
    );
    if (rag.length) {
      this.assistantId = rag[0].id;
      for (let i = 1; i < rag.length; i++) await this.openai.beta.assistants.delete(rag[i].id);
      return this.assistantId;
    }
    const assistant = await this.openai.beta.assistants.create({
      name: 'Product Search Assistant',
      instructions:
        'Search product inventory and return ALL relevant results. Always provide a total count. Use prior thread context.',
      model: 'gpt-4-turbo',
      tools: [{ type: 'file_search' }],
      tool_resources: { file_search: { vector_store_ids: [] } },
    });
    this.assistantId = assistant.id;
    return this.assistantId;
  }

  private async getOrCreateVectorStore(): Promise<string> {
    if (this.vectorStoreId) return this.vectorStoreId;
    const vectorStores = await this.openai.vectorStores.list();
    const inventoryStores = vectorStores.data.filter((vs: any) => vs.name === 'inventory-store');
    if (inventoryStores.length) {
      this.vectorStoreId = inventoryStores[0].id;
      for (let i = 1; i < inventoryStores.length; i++) await this.openai.vectorStores.delete(inventoryStores[i].id);
      return this.vectorStoreId;
    }
    const vectorStore = await this.openai.vectorStores.create({ name: 'inventory-store' });
    this.vectorStoreId = vectorStore.id;
    return this.vectorStoreId;
  }

  // 🔵 Reusable, persistent thread
  private async getOrCreateThread(): Promise<string> {
    if (this.threadId) return this.threadId;
    const thread = await this.openai.beta.threads.create({
      // Seed the thread with helpful system context
      metadata: { purpose: 'product_search' },
    });
    this.threadId = thread.id;
    // persist to disk so restarts keep context
    fs.writeFileSync(path.join(process.cwd(), '.rag.thread'), this.threadId, 'utf8');
    return this.threadId;
  }

  // Optional helper if you ever want to reset context
  async resetThread() {
    this.threadId = null;
    const fp = path.join(process.cwd(), '.rag.thread');
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  async updateInventory(markdownPath: string): Promise<void> {
    const vectorStoreId = await this.getOrCreateVectorStore();
    const files = await this.openai.vectorStores.files.list(vectorStoreId);
    for (const file of files.data) {
      await this.openai.vectorStores.files.delete(file.id, { vector_store_id: vectorStoreId });
    }
    await this.openai.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
      files: [fs.createReadStream(markdownPath)],
    });
    console.log(`📁 Updated vector store: ${path.basename(markdownPath)}`);
  }

  async searchProducts(query: string): Promise<string> {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 RAG AGENT PROCESSING');
    console.log('='.repeat(60));
    console.log(`📝 Query: "${query}"`);

    if (!this.vectorStoreId) {
      console.log('❌ No vector store found, requesting sync...');
      console.log('='.repeat(60));
      return 'SYNC_REQUIRED: No inventory data found. Please run sync_inventory first, then retry the search.';
    }

    const assistantId = await this.getOrCreateAssistant();
    await this.openai.beta.assistants.update(assistantId, {
      tool_resources: { file_search: { vector_store_ids: [this.vectorStoreId] } },
    });

    const threadId = await this.getOrCreateThread(); // ✅ reuse same thread

    // Append message to existing thread so history is retained
    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Search for products matching: ${query}.
Return ALL matching products with title, variant, SKU, price, quantity, and status.
Also provide: total count.
If relevant, use prior messages in this thread for context (e.g., filters set earlier).`,
      metadata: { kind: 'product_search' },
    });

    const run = await this.openai.beta.threads.runs.createAndPoll(threadId, { assistant_id: assistantId });

    if (run.status === 'completed') {
      const messages = await this.openai.beta.threads.messages.list(threadId, { order: 'desc', limit: 1 });
      const latest = messages.data[0];
      const first = latest?.content?.[0];
      const result = first?.type === 'text' ? first.text.value : 'No results found.';
      console.log('📋 RAG Results:\n' + result);
      console.log('='.repeat(60));
      return result;
    }

    // Surface tool-call errors for easier debugging
    if (run.last_error) {
      return `Search failed: ${run.last_error.code ?? ''} ${run.last_error.message ?? ''}`.trim();
    }
    return `Search failed with status: ${run.status}`;
  }
}
