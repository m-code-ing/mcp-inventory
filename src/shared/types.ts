import { Platform, ProductStatus } from '../services/validation-service';

export interface Product {
  id: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number;
  platform: Platform;
  variant?: string;
  status: ProductStatus;
}

export enum ProductHeaders {
  PLATFORM = 'Platform',
  ID = 'ID',
  TITLE = 'Title',
  VARIANT = 'Variant',
  SKU = 'SKU',
  QUANTITY = 'Quantity',
  PRICE = 'Price',
  STATUS = 'Status',
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  sku: string[];
  quantity: number;
  price: string;
  state: string;
}
