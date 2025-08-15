import { InventoryService } from '../../shared/inventory-service';

export async function handleSyncInventory(): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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