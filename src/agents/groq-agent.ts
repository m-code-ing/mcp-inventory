import OpenAI from 'openai';
import { MCPClient } from './mcp-client';
import { getOpenAITools, InventoryToolName } from '../shared/tool-definitions';
import { Logger } from '../shared/logger';
import dotenv from 'dotenv';

dotenv.config();

export class GroqInventoryAgent {
  private groq: OpenAI;
  private mcpClient: MCPClient;
  private logger: Logger;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor() {
    this.groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY!,
      baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    });

    this.mcpClient = new MCPClient();
    this.logger = Logger.getInstance();
  }

  private async executeTool(name: string, args: any): Promise<string> {
    const toolName = name as InventoryToolName;
    this.logger.toolExecution(toolName, args);
    this.logger.mcpCall(toolName);
    await this.mcpClient.connect();
    const result = await this.mcpClient.callTool(toolName, args);
    this.logger.mcpResponse(result);
    this.logger.processComplete();
    this.logger.finalAnswer();
    return result;
  }

  async chat(message: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: message });

      const systemPrompt = `You are an inventory management assistant for a Shopify store. You have access to powerful tools for inventory operations.

Available tools:
- data_operations: Fetch fresh inventory data from Shopify and save to files
- analytics: Perform analytics like counts, values, insights

IMPORTANT: When calling tools, use the exact JSON format. Present server responses directly without modification.`;

      // Create messages for Groq
      const messages = [{ role: 'system', content: systemPrompt }, ...this.conversationHistory];

      const response = await this.groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
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
          content: assistantMessage.content || 'Using tools...',
        });
        this.conversationHistory.push({
          role: 'user',
          content: `Tool results: ${toolResults}`,
        });

        const finalResponse = await this.groq.chat.completions.create({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, ...this.conversationHistory] as any,
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
