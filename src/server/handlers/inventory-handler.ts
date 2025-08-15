import { ExcelExporter } from '../../helpers/excel';
import fs from 'fs';

export async function handleReadInventory(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const filePath = args?.file_path || './inventory.xlsx';

    if (!fs.existsSync(filePath)) {
      return {
        content: [
          {
            type: 'text',
            text: `Inventory file not found at ${filePath}. Please run sync_inventory first.`,
          },
        ],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(filePath);

    const summary = {
      totalProducts: data.length,
      platforms: [...new Set(data.map((p) => p.platform))],
      totalValue: data.reduce((sum, p) => sum + p.price * p.quantity, 0),
      lowStock: data.filter((p) => p.quantity < 5).length,
    };

    return {
      content: [
        {
          type: 'text',
          text: `Inventory Summary:\n- Total Products: ${summary.totalProducts}\n- Platforms: ${summary.platforms.join(', ')}\n- Total Inventory Value: $${summary.totalValue.toFixed(2)}\n- Low Stock Items (< 5): ${summary.lowStock}\n\nData available for analysis.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error reading inventory: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
}