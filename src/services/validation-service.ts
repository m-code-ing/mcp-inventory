// Single source of truth for all validation definitions
const VALID_TOOL_NAMES = ['data_operations', 'analytics'] as const;
const VALID_DATA_OPERATIONS = ['sync', 'read', 'export'] as const;
const VALID_ANALYSIS_TYPES = ['count', 'value', 'low_stock', 'summary'] as const;
const VALID_PLATFORMS = ['shopify', 'etsy'] as const;
const VALID_STATUSES = ['active', 'draft', 'archived'] as const;
const VALID_EXPORT_FORMATS = ['excel', 'csv', 'json'] as const;

export type InventoryToolName = typeof VALID_TOOL_NAMES[number];
export type DataOperation = typeof VALID_DATA_OPERATIONS[number];
export type AnalysisType = typeof VALID_ANALYSIS_TYPES[number];
export type Platform = typeof VALID_PLATFORMS[number];
export type ProductStatus = typeof VALID_STATUSES[number];
export type ExportFormat = typeof VALID_EXPORT_FORMATS[number];

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // Tool validation
  private isValidToolName(name: string): name is InventoryToolName {
    return VALID_TOOL_NAMES.includes(name as InventoryToolName);
  }

  validateToolName(name: string): InventoryToolName {
    if (!this.isValidToolName(name)) {
      throw new Error(`Invalid tool name: ${name}. Valid tools: ${VALID_TOOL_NAMES.join(', ')}`);
    }
    return name;
  }

  // Operation validation
  validateDataOperation(operation: string): DataOperation {
    if (!VALID_DATA_OPERATIONS.includes(operation as DataOperation)) {
      throw new Error(`Invalid data operation: ${operation}. Valid operations: ${VALID_DATA_OPERATIONS.join(', ')}`);
    }
    return operation as DataOperation;
  }

  validateAnalysisType(analysisType: string): AnalysisType {
    if (!VALID_ANALYSIS_TYPES.includes(analysisType as AnalysisType)) {
      throw new Error(`Invalid analysis type: ${analysisType}. Valid types: ${VALID_ANALYSIS_TYPES.join(', ')}`);
    }
    return analysisType as AnalysisType;
  }

  // Filter validation
  validatePlatform(platform: string): Platform {
    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      throw new Error(`Invalid platform: ${platform}. Valid platforms: ${VALID_PLATFORMS.join(', ')}`);
    }
    return platform as Platform;
  }

  validateStatus(status: string): ProductStatus {
    if (!VALID_STATUSES.includes(status as ProductStatus)) {
      throw new Error(`Invalid status: ${status}. Valid statuses: ${VALID_STATUSES.join(', ')}`);
    }
    return status as ProductStatus;
  }

  validateExportFormat(format: string): ExportFormat {
    if (!VALID_EXPORT_FORMATS.includes(format as ExportFormat)) {
      throw new Error(`Invalid export format: ${format}. Valid formats: ${VALID_EXPORT_FORMATS.join(', ')}`);
    }
    return format as ExportFormat;
  }

  // Main validation method
  validateToolCall(name: string, args: any): { toolName: InventoryToolName; args: any } {
    const validatedToolName = this.validateToolName(name);
    return {
      toolName: validatedToolName,
      args: args || {}
    };
  }

  // Getters for valid values
  getValidToolNames(): readonly string[] {
    return VALID_TOOL_NAMES;
  }

  getValidDataOperations(): readonly string[] {
    return VALID_DATA_OPERATIONS;
  }

  getValidAnalysisTypes(): readonly string[] {
    return VALID_ANALYSIS_TYPES;
  }

  getValidPlatforms(): readonly string[] {
    return VALID_PLATFORMS;
  }

  getValidStatuses(): readonly string[] {
    return VALID_STATUSES;
  }

  getValidExportFormats(): readonly string[] {
    return VALID_EXPORT_FORMATS;
  }
}