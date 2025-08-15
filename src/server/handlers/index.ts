import { InventoryToolName } from '../../shared/tool-definitions';
import { handleSyncInventory } from './sync-handler';
import { handleReadInventory } from './inventory-handler';
import { handleCountProducts, handleGetLowStock, handleCalculateInventoryValue } from './analytics-handler';

export async function handleToolCall(name: InventoryToolName, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  switch (name) {
    case 'sync_inventory':
      return handleSyncInventory();
    
    case 'read_inventory':
      return handleReadInventory(args);
    
    case 'count_products':
      return handleCountProducts(args);
    
    case 'get_low_stock':
      return handleGetLowStock(args);
    
    case 'calculate_inventory_value':
      return handleCalculateInventoryValue(args);
    
    case 'search_inventory':
      // This is handled by RAG service, not MCP server
      throw new Error('search_inventory should be handled by RAG service');
    
    default:
      const _exhaustiveCheck: never = name;
      throw new Error(`Unhandled tool: ${_exhaustiveCheck}`);
  }
}