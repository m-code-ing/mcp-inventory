import OpenAI from 'openai';
import { MCPClient } from './mcp-client';
import { getOpenAITools, getToolInstructions, InventoryToolName, isValidToolName } from '../shared/tool-definitions';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class OllamaInventoryAgent {
  private ollama: OpenAI;
  private mcpClient: MCPClient;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor() {
    this.ollama = new OpenAI({
      apiKey: 'ollama', // Ollama doesn't need real API key
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    });

    this.mcpClient = new MCPClient();
  }

  private async executeTool(name: string, args: any): Promise<string> {
    if (!isValidToolName(name)) {
      throw new Error(`Invalid tool name: ${name}`);
    }
    
    return this.executeValidTool(name, args);
  }

  private async executeValidTool(name: InventoryToolName, args: any): Promise<string> {
    console.log('\n' + '='.repeat(60));
    console.log('🦙 PROCESS: Ollama Tool Execution');
    console.log('='.repeat(60));
    console.log(`🚀 Tool: ${name}`);
    console.log(`📝 Args:`, args);

    if (name === 'data_operations') {
      console.log('🔗 PROCESS: Calling MCP server...');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('data_operations', args);
      console.log('📊 PROCESS: Server response:', result);
      console.log('✅ PROCESS: Completed');
      console.log('\n' + '='.repeat(60));
      console.log('📋 FINAL ANSWER:');
      console.log('='.repeat(60));
      return result;
    }

    if (name === 'analytics') {
      console.log('🔗 PROCESS: Calling MCP server...');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('analytics', args);
      console.log('📊 PROCESS: Server response:', result);
      console.log('✅ PROCESS: Completed');
      console.log('\n' + '='.repeat(60));
      console.log('📋 FINAL ANSWER:');
      console.log('='.repeat(60));
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
      console.log('⚠️ PROCESS: Search not available in Ollama agent');
      console.log('\n' + '='.repeat(60));
      console.log('📋 FINAL ANSWER:');
      console.log('='.repeat(60));
      return 'Search functionality is not available in the Ollama agent. Please use the OpenAI agent for search capabilities.';
    }

    const _exhaustiveCheck: never = name;
    throw new Error(`Unhandled tool: ${_exhaustiveCheck}`);
  }

  async chat(message: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: message });

      const systemPrompt = `You are an inventory management assistant for a Shopify store. You have access to powerful tools for inventory operations.

Available tools:
- data_operations: Fetch fresh inventory data from Shopify and save to files
- analytics: Perform analytics like counts, values, insights
- management: Manage inventory tasks like cleanup, archive, delete

IMPORTANT: When calling tools, use the exact JSON format. Present server responses directly without modification.

Note: Search functionality is not available in this agent. Use the OpenAI agent for search capabilities.`;

      // Create messages for Ollama
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory
      ];

      const response = await this.ollama.chat.completions.create({
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        messages: messages as any,
        tools: getOpenAITools().filter(tool => tool.function.name !== 'search'),
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