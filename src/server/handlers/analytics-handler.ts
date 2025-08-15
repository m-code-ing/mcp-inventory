import { ExcelExporter } from '../../helpers/excel';
import fs from 'fs';

function getLatestInventoryFile(): string | null {
  const activeDir = './shopify/inventory/active';
  
  if (!fs.existsSync(activeDir)) {
    return null;
  }

  const files = fs.readdirSync(activeDir).filter(f => f.endsWith('.xlsx')).sort().reverse();
  return files.length > 0 ? `${activeDir}/${files[0]}` : null;
}

export async function handleCountProducts(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const filePath = getLatestInventoryFile();
    if (!filePath) {
      return {
        content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(filePath);
    
    let filteredData = data;
    if (args?.status) {
      filteredData = data.filter(p => p.status === args.status);
    }
    if (args?.platform) {
      filteredData = data.filter(p => p.platform === args.platform);
    }

    return {
      content: [{
        type: 'text',
        text: `Product count: ${filteredData.length}`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error counting products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export async function handleGetLowStock(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const threshold = args?.threshold || 5;
    const filePath = getLatestInventoryFile();
    
    if (!filePath) {
      return {
        content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(filePath);
    const lowStock = data.filter(p => p.quantity < threshold);

    return {
      content: [{
        type: 'text',
        text: `Low stock products (< ${threshold}): ${lowStock.length}\n${lowStock.map(p => `- ${p.title}: ${p.quantity}`).join('\n')}`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error getting low stock: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

export async function handleCalculateInventoryValue(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const filePath = getLatestInventoryFile();
    
    if (!filePath) {
      return {
        content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(filePath);
    
    let filteredData = data;
    if (args?.status) {
      filteredData = data.filter(p => p.status === args.status);
    }

    const totalValue = filteredData.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    return {
      content: [{
        type: 'text',
        text: `Total inventory value: $${totalValue.toFixed(2)} (${filteredData.length} products)`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error calculating value: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}