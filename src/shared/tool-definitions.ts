// Type-safe tool names organized by categories
export type InventoryToolName =
  | 'data_operations' // sync, read, export
  | 'analytics'; // count, calculate, analyze

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

Never refuse to use tools - always call the appropriate tool for the user's request.`;
}
