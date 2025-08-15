// Type-safe tool names organized by categories
export type InventoryToolName =
  | 'data_operations' // sync, read, export
  | 'analytics' // count, calculate, analyze
  | 'search' // search, filter, find
  | 'management'; // update, delete, archive

export interface ToolDefinition {
  name: InventoryToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const INVENTORY_TOOLS: Record<InventoryToolName, ToolDefinition> = {
  data_operations: {
    name: 'data_operations',
    description: 'Handle data operations: sync from Shopify, read inventory files, export to different formats',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['sync', 'read', 'export'],
          description: 'Type of data operation to perform',
        },
        format: {
          type: 'string',
          enum: ['excel', 'csv', 'json'],
          description: 'Format for export operations (optional)',
        },
        file_path: {
          type: 'string',
          description: 'File path for read operations (optional)',
        },
      },
      required: ['operation'],
    },
  },

  analytics: {
    name: 'analytics',
    description: 'Perform analytics: count products, calculate values, analyze stock levels, get insights',
    parameters: {
      type: 'object',
      properties: {
        analysis_type: {
          type: 'string',
          enum: ['count', 'value', 'low_stock', 'summary'],
          description: 'Type of analysis to perform',
        },
        filters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by product status',
            },
            platform: {
              type: 'string',
              description: 'Filter by platform',
            },
            threshold: {
              type: 'number',
              description: 'Threshold for low stock analysis',
            },
          },
        },
      },
      required: ['analysis_type'],
    },
  },

  search: {
    name: 'search',
    description: 'Search and filter inventory using natural language queries or specific criteria',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        filters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Filter by product title',
            },
            sku: {
              type: 'string',
              description: 'Filter by SKU',
            },
            price_range: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
              },
            },
          },
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
        },
      },
    },
  },

  management: {
    name: 'management',
    description: 'Manage inventory: update product info, archive old data, delete files',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['update', 'archive', 'delete', 'cleanup'],
          description: 'Management action to perform',
        },
        target: {
          type: 'string',
          description: 'Target for the action (product ID, file path, etc.)',
        },
        data: {
          type: 'object',
          description: 'Data for update operations',
        },
      },
      required: ['action'],
    },
  },
};

// Helper functions to convert to different formats
export function getMCPTools() {
  return Object.values(INVENTORY_TOOLS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.parameters,
  }));
}

export function getOpenAITools() {
  return Object.values(INVENTORY_TOOLS).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function getToolNames(): InventoryToolName[] {
  return Object.keys(INVENTORY_TOOLS) as InventoryToolName[];
}

export function isValidToolName(name: string): name is InventoryToolName {
  return name in INVENTORY_TOOLS;
}

export function getToolInstructions(): string {
  const toolList = Object.values(INVENTORY_TOOLS)
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join('\n');

  return `Available tools:
${toolList}

ALWAYS use the appropriate tool for user requests:
- For data operations (sync, read, export): use data_operations
- For analytics (counts, values, insights): use analytics
- For searching and filtering: use search
- For management tasks (update, archive, delete): use management

Never refuse to use tools - always call the appropriate tool for the user's request.`;
}
