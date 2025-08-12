import axios from 'axios';
import { Product, ShopifyProduct } from './types';

export class ShopifyClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(shopDomain: string, accessToken: string) {
    this.baseUrl = `https://${shopDomain}/admin/api/2023-10/`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    };
  }

  async fetchInventory(): Promise<Product[]> {
    const products: Product[] = [];
    let nextPageInfo: string | null = null;

    do {
      const url = nextPageInfo 
        ? `${this.baseUrl}products.json?page_info=${nextPageInfo}&limit=250`
        : `${this.baseUrl}products.json?limit=250`;

      const response = await axios.get(url, { headers: this.headers });
      const shopifyProducts: ShopifyProduct[] = response.data.products;

      for (const product of shopifyProducts) {
        for (const variant of product.variants) {
          products.push({
            id: `shopify_${variant.id}`,
            title: product.title,
            sku: variant.sku || '',
            quantity: variant.inventory_quantity || 0,
            price: parseFloat(variant.price),
            platform: 'shopify',
            variant: variant.title !== 'Default Title' ? variant.title : undefined,
            status: product.status
          });
        }
      }

      const linkHeader = response.headers.link;
      nextPageInfo = this.extractNextPageInfo(linkHeader);
    } while (nextPageInfo);

    return products;
  }

  private extractNextPageInfo(linkHeader?: string): string | null {
    if (!linkHeader) return null;
    const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    return nextMatch ? nextMatch[1] : null;
  }
}