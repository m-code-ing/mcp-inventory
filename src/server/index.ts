import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { InventoryService } from '../shared/inventory-service';
import { ExcelExporter } from '../shared/excel';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const server = new Server({
  name: 'inventory-sync-mcp',
  version: '1.0.0',
  capabilities: {
    tools: {},
    resources: {},
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sync_inventory',
        description: 'Fetch inventory from Shopify and save to timestamped Excel file in shopify/inventory directory',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'read_inventory',
        description: 'Read and analyze inventory data from Excel file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the Excel file (optional, defaults to ./inventory.xlsx)',
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
      const inventoryService = new InventoryService(process.env.SHOPIFY_STORE!, process.env.SHOPIFY_ACCESS_TOKEN!);

      const result = await inventoryService.syncInventory();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully synced ${result.productCount} products to ${result.excelPath}`,
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

  if (name === 'read_inventory') {
    try {
      const filePath = (args as any)?.file_path || './inventory.xlsx';

      if (!fs.existsSync(filePath)) {
        return {
          content: [
            {
              type: 'text',
              text: `Inventory file not found at ${filePath}. Please run sync_inventory first.`,
            },
          ],
          isError: true,
        };
      }

      const excelExporter = new ExcelExporter();
      const data = await excelExporter.readFromExcel(filePath);

      const summary = {
        totalProducts: data.length,
        platforms: [...new Set(data.map((p) => p.platform))],
        totalValue: data.reduce((sum, p) => sum + p.price * p.quantity, 0),
        lowStock: data.filter((p) => p.quantity < 5).length,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Inventory Summary:\n- Total Products: ${summary.totalProducts}\n- Platforms: ${summary.platforms.join(', ')}\n- Total Inventory Value: $${summary.totalValue.toFixed(2)}\n- Low Stock Items (< 5): ${summary.lowStock}\n\nData available for analysis.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading inventory: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const inventoryPath = './inventory.xlsx';
  const resources = [];

  if (fs.existsSync(inventoryPath)) {
    resources.push({
      uri: `file://${path.resolve(inventoryPath)}`,
      name: 'Current Inventory Data',
      description: 'Latest inventory data from Shopify',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri.startsWith('file://') && uri.endsWith('inventory.xlsx')) {
    const filePath = uri.replace('file://', '');

    if (fs.existsSync(filePath)) {
      const excelExporter = new ExcelExporter();
      const data = await excelExporter.readFromExcel(filePath);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
