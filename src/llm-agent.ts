import OpenAI from 'openai';
import { InventoryService } from './inventory-service';
import { ExcelExporter } from './excel';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export class InventoryLLMAgent {
  private openai: OpenAI;
  private inventoryService: InventoryService;
  private excelExporter: ExcelExporter;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.inventoryService = new InventoryService(process.env.SHOPIFY_STORE!, process.env.SHOPIFY_ACCESS_TOKEN!);

    this.excelExporter = new ExcelExporter();
  }

  private async executeTool(name: string, args: any): Promise<string> {
    if (name === 'sync_inventory') {
      const outputPath = args.output_path || './inventory.xlsx';
      const result = await this.inventoryService.syncInventory(outputPath);
      return `Successfully synced ${result.productCount} products to ${result.filePath}`;
    }

    if (name === 'read_inventory') {
      const filePath = args.file_path || './inventory.xlsx';

      if (!fs.existsSync(filePath)) {
        return `Inventory file not found at ${filePath}. Please run sync_inventory first.`;
      }

      const data = await this.excelExporter.readFromExcel(filePath);
      const summary = {
        totalProducts: data.length,
        platforms: [...new Set(data.map((p) => p.platform))],
        totalValue: data.reduce((sum, p) => sum + p.price * p.quantity, 0),
        lowStock: data.filter((p) => p.quantity < 5).length,
        outOfStock: data.filter((p) => p.quantity === 0).length,
      };

      return `Inventory Summary:
- Total Products: ${summary.totalProducts}
- Platforms: ${summary.platforms.join(', ')}
- Total Inventory Value: $${summary.totalValue.toFixed(2)}
- Low Stock Items (< 5): ${summary.lowStock}
- Out of Stock Items: ${summary.outOfStock}

Full inventory data loaded for detailed analysis.`;
    }

    if (name === 'analyze_inventory') {
      const query = args.query.toLowerCase();
      const filePath = args.file_path || './inventory.xlsx';

      if (!fs.existsSync(filePath)) {
        return `Inventory file not found at ${filePath}. Please run sync_inventory first.`;
      }

      const data = await this.excelExporter.readFromExcel(filePath);

      if (query.includes('out of stock')) {
        const outOfStock = data.filter((p) => p.quantity === 0);
        return `Out of Stock Products (${outOfStock.length}):\n${outOfStock
          .map((p) => `- ${p.title}${p.variant ? ` (${p.variant})` : ''} - SKU: ${p.sku || 'N/A'}`)
          .join('\n')}`;
      }

      if (query.includes('low stock')) {
        const lowStock = data.filter((p) => p.quantity > 0 && p.quantity < 5);
        return `Low Stock Products (${lowStock.length}):\n${lowStock
          .map((p) => `- ${p.title}${p.variant ? ` (${p.variant})` : ''} - Qty: ${p.quantity} - SKU: ${p.sku || 'N/A'}`)
          .join('\n')}`;
      }

      if (query.includes('high value') || query.includes('expensive')) {
        const highValue = data.sort((a, b) => b.price * b.quantity - a.price * a.quantity).slice(0, 10);
        return `Top 10 Highest Value Products:\n${highValue
          .map(
            (p) =>
              `- ${p.title}${p.variant ? ` (${p.variant})` : ''} - Value: $${(p.price * p.quantity).toFixed(2)} (${
                p.quantity
              } × $${p.price})`
          )
          .join('\n')}`;
      }

      if (query.includes('count') || query.includes('total')) {
        return `Product Counts:\n- Total: ${data.length}\n- In Stock: ${
          data.filter((p) => p.quantity > 0).length
        }\n- Out of Stock: ${data.filter((p) => p.quantity === 0).length}\n- Low Stock (<5): ${
          data.filter((p) => p.quantity > 0 && p.quantity < 5).length
        }`;
      }

      return `Available queries: out of stock, low stock, high value, count/total`;
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  async chat(message: string): Promise<string> {
    try {
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'sync_inventory',
            description: 'Fetch fresh inventory data from Shopify and save to Excel file',
            parameters: {
              type: 'object',
              properties: {
                output_path: {
                  type: 'string',
                  description: 'Path where to save the Excel file (optional, defaults to ./inventory.xlsx)',
                },
              },
            },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'read_inventory',
            description: 'Read and analyze existing inventory data from Excel file',
            parameters: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Path to the Excel file (optional, defaults to ./inventory.xlsx)',
                },
              },
            },
          },
        },
        {
          type: 'function' as const,
          function: {
            name: 'analyze_inventory',
            description:
              'Analyze inventory data for specific queries: out of stock, low stock, high value, count/total',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Analysis query: "out of stock", "low stock", "high value", "count"',
                },
                file_path: {
                  type: 'string',
                  description: 'Path to the Excel file (optional, defaults to ./inventory.xlsx)',
                },
              },
              required: ['query'],
            },
          },
        },
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: `You are an inventory management assistant for a Shopify store. You can help fetch inventory data and answer questions about it.

Available tools:
- sync_inventory: Fetch fresh inventory data from Shopify and save to Excel
- read_inventory: Read and get summary of inventory data from Excel file  
- analyze_inventory: Analyze inventory for specific queries

For detailed analysis, use analyze_inventory with queries like "out of stock", "low stock", "high value", or "count".`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        tools,
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0].message;

      if (assistantMessage.tool_calls) {
        const toolResults: string[] = [];

        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = (toolCall as any).function.name;
          const args = JSON.parse((toolCall as any).function.arguments || '{}');
          const result = await this.executeTool(functionName, args);
          toolResults.push(result);
        }

        const finalResponse = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an inventory management assistant. Based on the tool results, provide helpful analysis and answer the user's question.`,
            },
            {
              role: 'user',
              content: message,
            },
            {
              role: 'assistant',
              content: `Tool results: ${toolResults.join('\n\n')}`,
            },
          ],
        });

        return finalResponse.choices[0].message.content || 'No response generated.';
      }

      return assistantMessage.content || 'No response generated.';
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
}
