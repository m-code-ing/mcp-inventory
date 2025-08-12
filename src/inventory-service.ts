import { ShopifyClient } from './shopify';
import { EtsyClient } from './etsy';
import { ExcelExporter } from './excel';
import { Product } from './types';
import fs from 'fs';

export class InventoryService {
  private shopifyClient: ShopifyClient;
  // private etsyClient: EtsyClient; // Disabled for now
  private excelExporter: ExcelExporter;

  constructor(
    shopifyDomain: string,
    shopifyToken: string
    // etsyApiKey: string,
    // etsyToken: string,
    // etsyShopId: string
  ) {
    this.shopifyClient = new ShopifyClient(shopifyDomain, shopifyToken);
    // this.etsyClient = new EtsyClient(etsyApiKey, etsyToken, etsyShopId); // Disabled
    this.excelExporter = new ExcelExporter();
  }

  async syncInventory(): Promise<{ success: boolean; productCount: number; filePath: string }> {
    try {
      const shopifyProducts = await this.shopifyClient.fetchInventory();
      // const etsyProducts = await this.etsyClient.fetchInventory(); // Disabled

      const allProducts = shopifyProducts; // Only Shopify for now
      
      // Create directory and timestamped filename
      const dir = './shopify/inventory';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const finalPath = `${dir}/inventory_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      
      await this.excelExporter.saveToExcel(allProducts, finalPath);

      return {
        success: true,
        productCount: allProducts.length,
        filePath: finalPath,
      };
    } catch (error) {
      throw new Error(`Inventory sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
