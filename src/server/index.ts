import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getMCPTools } from '../services/tool-definition-service';
import { ValidationService } from '../services/validation-service';
import { handleToolCall } from './handlers';
import { ExcelExporter } from '../helpers/excel';
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
    tools: getMCPTools(),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const validator = ValidationService.getInstance();
  const { toolName, args: validatedArgs } = validator.validateToolCall(name, args);

  return await handleToolCall(toolName, validatedArgs);
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
