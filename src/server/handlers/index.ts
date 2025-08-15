import { InventoryToolName } from '../../shared/tool-definitions';
import { handleDataOperations } from './data-operations-handler';
import { handleAnalytics } from './analytics-handler';
import { handleSearch } from './search-handler';
import { handleManagement } from './management-handler';

export async function handleToolCall(name: InventoryToolName, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  switch (name) {
    case 'data_operations':
      return handleDataOperations(args);
    
    case 'analytics':
      return handleAnalytics(args);
    
    case 'search':
      return handleSearch(args);
    
    case 'management':
      return handleManagement(args);
    
    default:
      const _exhaustiveCheck: never = name;
      throw new Error(`Unhandled tool: ${_exhaustiveCheck}`);
  }
}