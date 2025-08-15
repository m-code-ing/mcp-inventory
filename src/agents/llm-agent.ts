import OpenAI from 'openai';
import { RAGService } from './rag-service';
import { MCPClient } from './mcp-client';
import { getOpenAITools, getToolInstructions, InventoryToolName, isValidToolName } from '../shared/tool-definitions';
import { Logger } from '../shared/logger';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class InventoryLLMAgent {
  private openai: OpenAI;
  private ragService: RAGService;
  private mcpClient: MCPClient;
  private logger: Logger;
  private assistantId: string | null = null;
  private threadId: string | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.ragService = new RAGService();
    this.mcpClient = new MCPClient();
    this.logger = Logger.getInstance();
  }

  private getAssistantConfig() {
    return {
      name: 'Inventory Management Assistant',
      instructions: `You are an inventory management assistant for a Shopify store. You have access to powerful tools for inventory operations.

${getToolInstructions()}

IMPORTANT: When you receive "MCP Server Response:" from a tool, present that exact data to the user without modification or interpretation. Do not add fictional product names or details.`,
      tools: getOpenAITools(),
      model: 'gpt-4',
    };
  }

  private async initializeAssistant(): Promise<void> {
    if (this.assistantId) return;

    const config = this.getAssistantConfig();

    // List existing assistants and clean up old main assistants
    this.logger.cleanup('Cleaning up old main assistants...');
    const assistants = await this.openai.beta.assistants.list();
    const mainAssistants = assistants.data.filter(
      (a) => a.name === 'Inventory Management Assistant' && a.tools?.some((tool) => tool.type === 'function')
    );

    if (mainAssistants.length > 0) {
      this.logger.info(`Found ${mainAssistants.length} existing assistants, updating first one and deleting others`);
      // Update the first one with latest config
      this.assistantId = mainAssistants[0].id;
      await this.openai.beta.assistants.update(this.assistantId, config);
      this.logger.success(`Updated existing assistant: ${this.assistantId}`);

      // Delete the rest
      for (let i = 1; i < mainAssistants.length; i++) {
        await this.openai.beta.assistants.delete(mainAssistants[i].id);
        this.logger.cleanup(`Deleted duplicate assistant: ${mainAssistants[i].id}`);
      }
      return;
    }

    // Create new assistant if none exists
    this.logger.info('Creating new main assistant...');
    const assistant = await this.openai.beta.assistants.create(config);

    this.assistantId = assistant.id;
    this.logger.success(`Main assistant created: ${assistant.id}`);
  }

  private async initializeThread(): Promise<void> {
    if (this.threadId) return;

    const thread = await this.openai.beta.threads.create();
    this.threadId = thread.id;
  }

  private async executeTool(name: string, args: any): Promise<string> {
    if (!isValidToolName(name)) {
      throw new Error(`Invalid tool name: ${name}`);
    }

    return this.executeValidTool(name, args);
  }

  private async executeValidTool(name: InventoryToolName, args: any): Promise<string> {
    this.logger.toolExecution(name, args);

    if (name === 'data_operations') {
      this.logger.mcpCall('data operations');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('data_operations', args);
      this.logger.mcpResponse(result);
      this.logger.processComplete();
      this.logger.finalAnswer();
      return result;
    }

    if (name === 'analytics') {
      this.logger.mcpCall('analytics');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('analytics', args);
      this.logger.mcpResponse(result);
      this.logger.processComplete();
      this.logger.finalAnswer();
      return result;
    }

    if (name === 'management') {
      console.log('🔗 Calling MCP server management...');
      await this.mcpClient.connect();
      const result = await this.mcpClient.callTool('management', args);
      console.log('✅ MCP management completed');
      return result;
    }

    if (name === 'search') {
      const query = args.query || args.filters?.title || 'general search';
      this.logger.ragCall(query);
      const results = await this.ragService.searchProducts(query);

      // Check if sync is required
      if (results.startsWith('SYNC_REQUIRED:')) {
        this.logger.processWarning('Sync required');
        this.logger.finalAnswer();
        return 'Please sync inventory first using the data_operations tool with operation: sync.';
      }

      this.logger.processComplete();
      this.logger.finalAnswer();
      return results;
    }

    // TypeScript ensures we handle all tool names
    const _exhaustiveCheck: never = name;
    throw new Error(`Unhandled tool: ${_exhaustiveCheck}`);
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
