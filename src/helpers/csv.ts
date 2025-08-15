import { Product, ProductHeaders } from '../shared/types';
import { Platform, ProductStatus } from '../services/validation-service';
import fs from 'fs';

export class CSVExporter {
  async saveToCsv(products: Product[], filePath: string): Promise<void> {
    const headers = Object.values(ProductHeaders).join(',') + '\n';
    const rows = products
      .map(
        (product) =>
          `${product.platform},"${product.id}","${product.title}","${product.variant || ''}","${product.sku || ''}",${product.quantity},${product.price},"${product.status}"`
      )
      .join('\n');

    fs.writeFileSync(filePath, headers + rows);
  }

  async readFromCsv(filePath: string): Promise<Product[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');

    return lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = this.parseCsvLine(line);
        return {
          platform: values[0] as Platform,
          id: values[1],
          title: values[2],
          variant: values[3] || undefined,
          sku: values[4] || undefined,
          quantity: parseInt(values[5]) || 0,
          price: parseFloat(values[6]) || 0,
          status: values[7] as ProductStatus,
        };
      });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }
}
