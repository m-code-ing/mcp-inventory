import OpenAI from 'openai';
import { RAGService } from './rag-service';
import { MCPClient } from './mcp-client';
import { getOpenAITools, getToolInstructions, InventoryToolName, isValidToolName } from '../shared/tool-definitions';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class OllamaInventoryAgent {
  private ollama: OpenAI;
  private ragService: RAGService;
  private mcpClient: MCPClient;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor() {
    this.ollama = new OpenAI({
      apiKey: 'ollama', // Ollama doesn't need real API key
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    });

    this.ragService = new RAGService();
    this.mcpClient = new MCPClient();
  }

  private async executeTool(name: string, args: any): Promise<string> {
    if (!isValidToolName(name)) {
      throw new Error(`Invalid tool name: ${name}`);
    }
    
    return this.executeValidTool(name, args);
  }

  private async executeValidTool(name: InventoryToolName, args: any): Promise<string> {
    console.log('\n' + '-'.repeat(50));
    console.log('🦙 OLLAMA AGENT TOOL EXECUTION');
    console.log('-'.repeat(50));
    console.log(`🚀 Executing tool: ${name}`);
    console.log(`📝 Arguments:`, args);

    if (name === 'data_operations') {
      console.log('🔗 Calling MCP server data_operations...');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('data_operations', args);
      console.log('📊 MCP Server Result:', result);
      console.log('✅ MCP data operation completed');
      return result;
    }

    if (name === 'analytics') {
      console.log('🔗 Calling MCP server analytics...');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('analytics', args);
      console.log('📊 MCP Server Result:', result);
      console.log('✅ MCP analytics completed');
      return result;
    }

    if (name === 'management') {
      console.log('🔗 Calling MCP server management...');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('management', args);
      console.log('📊 MCP Server Result:', result);
      console.log('✅ MCP management completed');
      return result;
    }

    if (name === 'search') {
      const query = args.query || args.filters?.title || 'general search';
      console.log(`🔍 Delegating search to RAG agent: "${query}"`);
      const results = await this.ragService.searchProducts(query);

      if (results.startsWith('SYNC_REQUIRED:')) {
        return 'Please sync inventory first using the data_operations tool with operation: sync.';
      }

      console.log('\n' + '-'.repeat(50));
      console.log('✅ OLLAMA AGENT TOOL COMPLETED');
      console.log('-'.repeat(50));
      return results;
    }

    const _exhaustiveCheck: never = name;
    throw new Error(`Unhandled tool: ${_exhaustiveCheck}`);
  }

  async chat(message: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: message });

      const systemPrompt = `You are an inventory management assistant for a Shopify store. You have access to powerful tools for inventory operations.

${getToolInstructions()}

IMPORTANT: When calling tools, use the exact JSON format. Present server responses directly without modification.

Available tools: data_operations, analytics, search, management`;

      // Create messages for Ollama
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory
      ];

      const response = await this.ollama.chat.completions.create({
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        messages: messages as any,
        tools: getOpenAITools(),
        tool_choice: 'auto',
        temperature: 0.1,
      });

      const assistantMessage = response.choices[0].message;

      // Handle tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        let toolResults = '';

        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type === 'function') {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const result = await this.executeTool(toolCall.function.name, args);
            toolResults += `${result}\n`;
          }
        }

        // Add tool results to conversation and get final response
        this.conversationHistory.push({ 
          role: 'assistant', 
          content: assistantMessage.content || 'Using tools...' 
        });
        this.conversationHistory.push({ 
          role: 'user', 
          content: `Tool results: ${toolResults}` 
        });

        const finalResponse = await this.ollama.chat.completions.create({
          model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory
          ] as any,
          temperature: 0.1,
        });

        const finalContent = finalResponse.choices[0].message.content || 'No response generated.';
        this.conversationHistory.push({ role: 'assistant', content: finalContent });
        return finalContent;
      }

      // No tool calls, just regular response
      const content = assistantMessage.content || 'No response generated.';
      this.conversationHistory.push({ role: 'assistant', content });
      return content;

    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
}