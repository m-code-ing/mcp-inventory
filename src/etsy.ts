import axios from 'axios';
import { Product, EtsyListing } from './types';

export class EtsyClient {
  private baseUrl = 'https://openapi.etsy.com/v3/application';
  private headers: Record<string, string>;
  private shopId: string;

  constructor(apiKey: string, accessToken: string, shopId: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };
    this.shopId = shopId;
  }

  async fetchInventory(): Promise<Product[]> {
    const products: Product[] = [];
    let offset = 0;
    const limit = 100;

    do {
      const url = `${this.baseUrl}/shops/${this.shopId}/listings/active?limit=${limit}&offset=${offset}`;
      const response = await axios.get(url, { headers: this.headers });
      const listings: EtsyListing[] = response.data.results;

      if (listings.length === 0) break;

      for (const listing of listings) {
        products.push({
          id: `etsy_${listing.listing_id}`,
          title: listing.title,
          sku: listing.sku?.[0] || '',
          quantity: listing.quantity,
          price: parseFloat(listing.price),
          platform: 'etsy',
          status: listing.state,
        });
      }

      offset += limit;
    } while (true);

    return products;
  }
}
