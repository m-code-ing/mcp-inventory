import { ExcelExporter } from '../../helpers/excel';
import fs from 'fs';

type HandlerResponse = { content: Array<{ type: string; text: string }>; isError?: boolean };

export class AnalyticsHandler {
  private excelExporter: ExcelExporter;

  constructor() {
    this.excelExporter = new ExcelExporter();
  }

  private getLatestInventoryFile(): string | null {
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

  async handle(args: any): Promise<HandlerResponse> {
    const { analysis_type, filters = {} } = args;

    switch (analysis_type) {
      case 'count':
        return this.handleCount(filters);

      case 'value':
        return this.handleValue(filters);

      case 'low_stock':
        return this.handleLowStock(filters);

      case 'summary':
        return this.handleSummary(filters);

      default:
        return {
          content: [{ type: 'text', text: `Unknown analysis type: ${analysis_type}` }],
          isError: true,
        };
    }
  }

  private async handleCount(filters: any): Promise<HandlerResponse> {
    try {
      const filePath = this.getLatestInventoryFile();
      if (!filePath) {
        return {
          content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
          isError: true,
        };
      }

      const data = await this.excelExporter.readFromExcel(filePath);

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

  private async handleLowStock(filters: any): Promise<HandlerResponse> {
    try {
      const threshold = filters.threshold || 5;
      const filePath = this.getLatestInventoryFile();

      if (!filePath) {
        return {
          content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
          isError: true,
        };
      }

      const data = await this.excelExporter.readFromExcel(filePath);
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

  private async handleValue(filters: any): Promise<HandlerResponse> {
    try {
      const filePath = this.getLatestInventoryFile();

      if (!filePath) {
        return {
          content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
          isError: true,
        };
      }

      const data = await this.excelExporter.readFromExcel(filePath);

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

  private async handleSummary(filters: any): Promise<HandlerResponse> {
    try {
      const filePath = this.getLatestInventoryFile();

      if (!filePath) {
        return {
          content: [{ type: 'text', text: 'No inventory files found. Please sync first.' }],
          isError: true,
        };
      }

      const data = await this.excelExporter.readFromExcel(filePath);

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
}

export async function handleAnalytics(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const handler = new AnalyticsHandler();
  return handler.handle(args);
}
