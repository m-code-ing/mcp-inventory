const { InventoryService } = require('./dist/inventory-service');
require('dotenv').config();

async function testShopify() {
  try {
    console.log('Testing Shopify connection...');
    
    if (!process.env.SHOPIFY_STORE || !process.env.SHOPIFY_ACCESS_TOKEN) {
      console.error('Please set SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN in your .env file');
      return;
    }

    const service = new InventoryService(
      process.env.SHOPIFY_STORE,
      process.env.SHOPIFY_ACCESS_TOKEN
    );

    const result = await service.syncInventory('./test-inventory.xlsx');
    console.log('Success!', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testShopify();