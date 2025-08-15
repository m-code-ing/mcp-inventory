import { InventoryToolName, ValidationService } from './validation-service';

// Re-export for convenience
export { InventoryToolName };

export interface ToolDefinition {
  name: InventoryToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class ToolDefinitionService {
  private static instance: ToolDefinitionService;
  private validator: ValidationService;
  private inventoryTools: Record<InventoryToolName, ToolDefinition>;

  private constructor() {
    this.validator = ValidationService.getInstance();
    this.inventoryTools = this.initializeTools();
  }

  static getInstance(): ToolDefinitionService {
    if (!ToolDefinitionService.instance) {
      ToolDefinitionService.instance = new ToolDefinitionService();
    }
    return ToolDefinitionService.instance;
  }

  private initializeTools(): Record<InventoryToolName, ToolDefinition> {
    return {
      data_operations: {
        name: 'data_operations',
        description: 'Handle data operations: sync from Shopify, read inventory files, export to different formats',
        parameters: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: this.validator.getValidDataOperations(),
              description: 'Type of data operation to perform',
            },
            format: {
              type: 'string',
              enum: this.validator.getValidExportFormats(),
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
              enum: this.validator.getValidAnalysisTypes(),
              description: 'Type of analysis to perform',
            },
            filters: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: this.validator.getValidStatuses(),
                  description: 'Filter by product status',
                },
                platform: {
                  type: 'string',
                  enum: this.validator.getValidPlatforms(),
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
  }

  getTools(): Record<InventoryToolName, ToolDefinition> {
    return this.inventoryTools;
  }

  getTool(name: InventoryToolName): ToolDefinition {
    return this.inventoryTools[name];
  }

  getMCPTools() {
    return Object.values(this.inventoryTools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    }));
  }

  getOpenAITools() {
    return Object.values(this.inventoryTools).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  getToolInstructions(): string {
    const toolList = Object.values(this.inventoryTools)
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `Available tools:
${toolList}

ALWAYS use the appropriate tool for user requests:
- For data operations (${this.validator.getValidDataOperations().join(', ')}): use data_operations
- For analytics (${this.validator.getValidAnalysisTypes().join(', ')}): use analytics

Never refuse to use tools - always call the appropriate tool for the user's request.`;
  }
}

// Backward compatibility exports
export function getMCPTools() {
  return ToolDefinitionService.getInstance().getMCPTools();
}

export function getOpenAITools() {
  return ToolDefinitionService.getInstance().getOpenAITools();
}

export function getToolInstructions(): string {
  return ToolDefinitionService.getInstance().getToolInstructions();
}
