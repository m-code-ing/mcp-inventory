import { Product } from './types';
import fs from 'fs';

export class MarkdownExporter {
  async saveToMarkdown(products: Product[], filePath: string): Promise<void> {
    const content = products
      .map(
        (product) =>
          `## SKU: ${product.sku || 'N/A'}
Title: ${product.title}
Variant: ${product.variant || 'N/A'}
Price: $${product.price}
Qty: ${product.quantity}
Status: ${product.status}
Platform: ${product.platform.toUpperCase()}
---`
      )
      .join('\n\n');

    fs.writeFileSync(filePath, content);
  }
}
