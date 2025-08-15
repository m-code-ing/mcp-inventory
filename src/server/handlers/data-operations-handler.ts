import { InventoryService } from '../../shared/inventory-service';
import { ExcelExporter } from '../../helpers/excel';
import { CSVExporter } from '../../helpers/csv';
import fs from 'fs';

export async function handleDataOperations(
  args: any
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const { operation, format, file_path } = args;

  switch (operation) {
    case 'sync':
      return handleSync();

    case 'read':
      return handleRead(file_path);

    case 'export':
      return handleExport(format || 'excel');

    default:
      return {
        content: [{ type: 'text', text: `Unknown data operation: ${operation}` }],
        isError: true,
      };
  }
}

async function handleSync(): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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
          text: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleRead(
  filePath?: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const targetPath = filePath || './inventory.xlsx';

    if (!fs.existsSync(targetPath)) {
      return {
        content: [
          {
            type: 'text',
            text: `File not found at ${targetPath}. Please sync inventory first.`,
          },
        ],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(targetPath);

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
          text: `Inventory Summary:\n- Total Products: ${summary.totalProducts}\n- Platforms: ${summary.platforms.join(', ')}\n- Total Inventory Value: $${summary.totalValue.toFixed(2)}\n- Low Stock Items (< 5): ${summary.lowStock}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Read error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleExport(
  format: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const activeDir = './shopify/inventory/active';
    const files = fs
      .readdirSync(activeDir)
      .filter((f) => f.endsWith('.xlsx'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return {
        content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(`${activeDir}/${files[0]}`);

    let outputPath: string;

    switch (format) {
      case 'csv':
        const csvExporter = new CSVExporter();
        outputPath = `${activeDir}/inventory_export.csv`;
        await csvExporter.saveToCsv(data, outputPath);
        break;

      case 'json':
        outputPath = `${activeDir}/inventory_export.json`;
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        break;

      default:
        outputPath = files[0]; // Already in Excel format
    }

    return {
      content: [
        {
          type: 'text',
          text: `Successfully exported ${data.length} products to ${outputPath} (${format} format)`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Export error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
