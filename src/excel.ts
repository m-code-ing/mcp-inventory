import ExcelJS from 'exceljs';
import { Product } from './types';

export class ExcelExporter {
  async saveToExcel(products: Product[], filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    worksheet.columns = [
      { header: 'Platform', key: 'platform', width: 10 },
      { header: 'Product ID', key: 'id', width: 20 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Variant', key: 'variant', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };

    products.forEach((product) => {
      worksheet.addRow({
        platform: product.platform.toUpperCase(),
        id: product.id,
        title: product.title,
        sku: product.sku,
        variant: product.variant || '',
        quantity: product.quantity,
        price: product.price,
        status: product.status,
      });
    });

    await workbook.xlsx.writeFile(filePath);
  }

  async readFromExcel(filePath: string): Promise<Product[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet('Inventory');
    const products: Product[] = [];

    worksheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const product: Product = {
        platform: (row.getCell(1).value as string)?.toLowerCase() as 'shopify' | 'etsy',
        id: row.getCell(2).value as string,
        title: row.getCell(3).value as string,
        sku: row.getCell(4).value as string,
        variant: (row.getCell(5).value as string) || undefined,
        quantity: Number(row.getCell(6).value) || 0,
        price: Number(row.getCell(7).value) || 0,
        status: row.getCell(8).value as string,
      };

      products.push(product);
    });

    return products;
  }
}
