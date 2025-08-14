import OpenAI from 'openai';
import { Product } from './types';

export class RAGService {
  private openai: OpenAI;
  private vectorStoreId: string | null = null;
  private assistantId: string | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  private async getOrCreateAssistant(): Promise<string> {
    if (this.assistantId) {
      return this.assistantId;
    }

    const assistants = await this.openai.beta.assistants.list();
    const ragAssistants = assistants.data.filter(
      (a) => a.name === 'Product Search Assistant' && a.tools?.some((tool) => tool.type === 'file_search')
    );

    if (ragAssistants.length > 0) {
      this.assistantId = ragAssistants[0].id;
      // Delete extras
      for (let i = 1; i < ragAssistants.length; i++) {
        await this.openai.beta.assistants.delete(ragAssistants[i].id);
      }
      return this.assistantId;
    }

    const assistant = await this.openai.beta.assistants.create({
      name: 'Product Search Assistant',
      instructions: 'Search through product inventory and return ALL relevant results. Always provide a total count.',
      model: 'gpt-4-turbo',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: []
        }
      }
    });
    this.assistantId = assistant.id;
    return this.assistantId;
  }

  private async getOrCreateVectorStore(): Promise<string> {
    if (this.vectorStoreId) {
      return this.vectorStoreId;
    }

    const vectorStores = await this.openai.vectorStores.list();
    const inventoryStores = vectorStores.data.filter((vs: any) => vs.name === 'inventory-store');

    if (inventoryStores.length > 0) {
      this.vectorStoreId = inventoryStores[0].id;
      // Delete extras
      for (let i = 1; i < inventoryStores.length; i++) {
        await this.openai.vectorStores.delete(inventoryStores[i].id);
      }
      return this.vectorStoreId;
    }

    const vectorStore = await this.openai.vectorStores.create({
      name: 'inventory-store',
    });
    this.vectorStoreId = vectorStore.id;
    return this.vectorStoreId;
  }

  async updateInventory(markdownPath: string): Promise<void> {
    const fs = require('fs');
    const vectorStoreId = await this.getOrCreateVectorStore();

    // Get existing files in vector store
    const files = await this.openai.vectorStores.files.list(vectorStoreId);

    // Delete old files
    for (const file of files.data) {
      await this.openai.vectorStores.files.delete(file.id, { vector_store_id: vectorStoreId });
    }

    // Upload new markdown file
    await this.openai.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
      files: [fs.createReadStream(markdownPath)],
    });

    console.log(`📁 Updated vector store with: ${markdownPath.split('/').pop()}`);
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
    
    // Update assistant to use the vector store
    await this.openai.beta.assistants.update(assistantId, {
      tool_resources: {
        file_search: {
          vector_store_ids: [this.vectorStoreId]
        }
      }
    });

    const thread = await this.openai.beta.threads.create();

    await this.openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Search for products matching: ${query}. Return ALL matching products with details including title, variant, SKU, price, quantity, and status. Provide a total count of matching products.`,
    });

    const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    if (run.status === 'completed') {
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const result = messages.data[0].content[0].type === 'text' 
        ? messages.data[0].content[0].text.value 
        : 'No results found.';
      console.log('📋 RAG Results:');
      console.log(result);
      console.log('='.repeat(60));
      return result;
    }

    return 'Search failed.';
  }
}