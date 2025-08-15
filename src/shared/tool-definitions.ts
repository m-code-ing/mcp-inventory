// Type-safe tool names
export type InventoryToolName =
  | 'sync_inventory'
  | 'read_inventory'
  | 'count_products'
  | 'get_low_stock'
  | 'calculate_inventory_value'
  | 'search_inventory';

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
  sync_inventory: {
    name: 'sync_inventory',
    description: 'Fetch fresh inventory data from Shopify and save to files',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  read_inventory: {
    name: 'read_inventory',
    description: 'Get deterministic inventory summary with exact counts and statistics',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to inventory file (optional)',
        },
      },
    },
  },

  count_products: {
    name: 'count_products',
    description: 'Get exact product counts by status, platform, or other criteria',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (active, draft, etc.)',
        },
        platform: {
          type: 'string',
          description: 'Filter by platform (shopify, etsy)',
        },
      },
    },
  },

  get_low_stock: {
    name: 'get_low_stock',
    description: 'Get products with low stock (quantity below threshold)',
    parameters: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Stock threshold (default: 5)',
        },
      },
    },
  },

  calculate_inventory_value: {
    name: 'calculate_inventory_value',
    description: 'Calculate total inventory value with optional filters',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (optional)',
        },
      },
    },
  },

  search_inventory: {
    name: 'search_inventory',
    description: 'Search and analyze inventory using natural language queries',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for products',
        },
      },
      required: ['query'],
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
- For syncing: use sync_inventory
- For general summaries: use read_inventory
- For specific counts: use count_products
- For low stock queries: use get_low_stock
- For value calculations: use calculate_inventory_value
- For product searches: use search_inventory

Never refuse to use tools - always call the appropriate tool for the user's request.`;
}
