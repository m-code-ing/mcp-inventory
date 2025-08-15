import { ShopifyClient } from '../clients/shopify';
import { EtsyClient } from '../helpers/etsy';
import { ExcelExporter } from '../helpers/excel';
import { MarkdownExporter } from './markdown';
import { Product } from './types';
import fs from 'fs';

export class InventoryService {
  private shopifyClient: ShopifyClient;
  // private etsyClient: EtsyClient; // Disabled for now
  private excelExporter: ExcelExporter;
  private markdownExporter: MarkdownExporter;

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
    this.markdownExporter = new MarkdownExporter();
  }

  private manageInventoryFiles(): void {
    const activeDir = './shopify/inventory/active';
    const cachedDir = './shopify/inventory/cached';

    // Create directories if they don't exist
    if (!fs.existsSync(activeDir)) {
      fs.mkdirSync(activeDir, { recursive: true });
    }
    if (!fs.existsSync(cachedDir)) {
      fs.mkdirSync(cachedDir, { recursive: true });
    }

    // Move all files from active to cached
    const activeFiles = fs.readdirSync(activeDir);
    for (const file of activeFiles) {
      const sourcePath = `${activeDir}/${file}`;
      const destPath = `${cachedDir}/${file}`;
      fs.renameSync(sourcePath, destPath);
    }
  }

  async syncInventory(): Promise<{
    success: boolean;
    productCount: number;
    excelPath: string;
    markdownPath: string;
  }> {
    try {
      // Move existing files to cached before fetching new data
      this.manageInventoryFiles();

      const shopifyProducts = await this.shopifyClient.fetchInventory();
      // const etsyProducts = await this.etsyClient.fetchInventory(); // Disabled

      const allProducts = shopifyProducts; // Only Shopify for now

      // Save new files to active directory
      const activeDir = './shopify/inventory/active';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const excelPath = `${activeDir}/inventory_${timestamp}.xlsx`;
      const markdownPath = `${activeDir}/inventory_${timestamp}.md`;

      await this.excelExporter.saveToExcel(allProducts, excelPath);
      await this.markdownExporter.saveToMarkdown(allProducts, markdownPath);

      return {
        success: true,
        productCount: allProducts.length,
        excelPath,
        markdownPath,
      };
    } catch (error) {
      throw new Error(`Inventory sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
