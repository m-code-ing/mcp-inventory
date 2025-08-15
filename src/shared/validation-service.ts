import { InventoryToolName, isValidToolName } from './tool-definitions';

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  validateToolName(name: string): InventoryToolName {
    if (!isValidToolName(name)) {
      throw new Error(`Invalid tool name: ${name}`);
    }
    return name;
  }

  validateToolCall(name: string, args: any): { toolName: InventoryToolName; args: any } {
    const validatedToolName = this.validateToolName(name);
    return {
      toolName: validatedToolName,
      args: args || {}
    };
  }
}