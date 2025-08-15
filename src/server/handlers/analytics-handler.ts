import { ExcelExporter } from '../../helpers/excel';
import fs from 'fs';

function getLatestInventoryFile(): string | null {
  const activeDir = './shopify/inventory/active';

  if (!fs.existsSync(activeDir)) {
    return null;
  }

  const files = fs
    .readdirSync(activeDir)
    .filter((f) => f.endsWith('.xlsx'))
    .sort()
    .reverse();
  return files.length > 0 ? `${activeDir}/${files[0]}` : null;
}

export async function handleAnalytics(
  args: any
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const { analysis_type, filters = {} } = args;

  switch (analysis_type) {
    case 'count':
      return handleCount(filters);

    case 'value':
      return handleValue(filters);

    case 'low_stock':
      return handleLowStock(filters);

    case 'summary':
      return handleSummary(filters);

    default:
      return {
        content: [{ type: 'text', text: `Unknown analysis type: ${analysis_type}` }],
        isError: true,
      };
  }
}

async function handleCount(
  filters: any
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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
    if (filters.status) {
      filteredData = filteredData.filter((p) => p.status === filters.status);
    }
    if (filters.platform) {
      filteredData = filteredData.filter((p) => p.platform === filters.platform);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Product count: ${filteredData.length}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Count error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleLowStock(
  filters: any
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const threshold = filters.threshold || 5;
    const filePath = getLatestInventoryFile();

    if (!filePath) {
      return {
        content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
        isError: true,
      };
    }

    const excelExporter = new ExcelExporter();
    const data = await excelExporter.readFromExcel(filePath);
    const lowStock = data.filter((p) => p.quantity < threshold);

    return {
      content: [
        {
          type: 'text',
          text: `${lowStock.length} items < ${threshold}.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Low stock error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleValue(
  filters: any
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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
    if (filters.status) {
      filteredData = filteredData.filter((p) => p.status === filters.status);
    }

    const totalValue = filteredData.reduce((sum, p) => sum + p.price * p.quantity, 0);

    return {
      content: [
        {
          type: 'text',
          text: `Total inventory value: $${totalValue.toFixed(2)} (${filteredData.length} products)`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Value calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleSummary(
  filters: any
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
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

    const summary = {
      totalProducts: data.length,
      activeProducts: data.filter((p) => p.status === 'active').length,
      platforms: [...new Set(data.map((p) => p.platform))],
      totalValue: data.reduce((sum, p) => sum + p.price * p.quantity, 0),
      lowStock: data.filter((p) => p.quantity < 5).length,
      outOfStock: data.filter((p) => p.quantity === 0).length,
    };

    return {
      content: [
        {
          type: 'text',
          text: `Analytics Summary:\n- Total Products: ${summary.totalProducts}\n- Active Products: ${summary.activeProducts}\n- Platforms: ${summary.platforms.join(', ')}\n- Total Value: $${summary.totalValue.toFixed(2)}\n- Low Stock (< 5): ${summary.lowStock}\n- Out of Stock: ${summary.outOfStock}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Summary error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
