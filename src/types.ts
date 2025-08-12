export interface Product {
  id: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number;
  platform: 'shopify' | 'etsy';
  variant?: string;
  status: string;
}



export interface EtsyListing {
  listing_id: number;
  title: string;
  sku: string[];
  quantity: number;
  price: string;
  state: string;
}
