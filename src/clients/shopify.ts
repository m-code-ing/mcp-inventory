import { createAdminApiClient } from '@shopify/admin-api-client';
import { Product } from '../shared/types';

export class ShopifyClient {
  private client: ReturnType<typeof createAdminApiClient>;

  constructor(shopDomain: string, accessToken: string) {
    this.client = createAdminApiClient({
      storeDomain: shopDomain,
      accessToken,
      apiVersion: '2023-10',
    });
  }

  async fetchInventory(): Promise<Product[]> {
    const products: Product[] = [];
    let cursor: string | undefined;

    do {
      const query = `
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                status
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response = await this.client.request(query, {
        variables: { first: 50, after: cursor },
      });

      const { products: productData } = response.data as any;

      for (const edge of productData.edges) {
        const product = edge.node;
        for (const variantEdge of product.variants.edges) {
          const variant = variantEdge.node;
          products.push({
            id: variant.id,
            title: product.title,
            sku: variant.sku || '',
            quantity: variant.inventoryQuantity || 0,
            price: parseFloat(variant.price) || 0,
            platform: 'shopify',
            variant: variant.title !== 'Default Title' ? variant.title : undefined,
            status: product.status.toLowerCase(),
          });
        }
      }

      cursor = productData.pageInfo.hasNextPage ? productData.pageInfo.endCursor : undefined;
    } while (cursor);

    return products;
  }
}
