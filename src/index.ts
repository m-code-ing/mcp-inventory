import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { InventoryService } from './inventory-service';
import dotenv from 'dotenv';

dotenv.config();

const server = new Server({
  name: 'inventory-sync-mcp',
  version: '1.0.0',
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sync_inventory',
        description: 'Fetch inventory from Shopify and Etsy, then save to Excel file',
        inputSchema: {
          type: 'object',
          properties: {
            output_path: {
              type: 'string',
              description: 'Path where to save the Excel file (optional, defaults to ./inventory.xlsx)',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'sync_inventory') {
    try {
      const outputPath = (args as any)?.output_path || process.env.OUTPUT_PATH || './inventory.xlsx';
      
      const inventoryService = new InventoryService(
        process.env.SHOPIFY_SHOP_DOMAIN!,
        process.env.SHOPIFY_ACCESS_TOKEN!,
        process.env.ETSY_API_KEY!,
        process.env.ETSY_ACCESS_TOKEN!,
        process.env.ETSY_SHOP_ID!
      );

      const result = await inventoryService.syncInventory(outputPath);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully synced ${result.productCount} products to ${result.filePath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);