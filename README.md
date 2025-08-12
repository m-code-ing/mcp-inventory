# Inventory Sync MCP Server

MCP server that fetches inventory data from Shopify and Etsy accounts and saves to Excel.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your API credentials:
```bash
cp .env.example .env
```

3. Build the project:
```bash
npm run build
```

## Configuration

Edit `.env` with your API credentials:

- **Shopify**: Shop domain and access token from private app
- **Etsy**: API key, access token, and shop ID
- **Output**: Excel file path (optional)

## Usage

### As MCP Server
Run with MCP client:
```bash
npm start
```

### Manual Testing
```bash
npm run dev
```

## MCP Tool

- `sync_inventory`: Fetches all active products from both platforms and saves to Excel
  - Optional parameter: `output_path` (defaults to ./inventory.xlsx)

## Excel Output

The generated Excel file contains:
- Platform (SHOPIFY/ETSY)
- Product ID
- Title
- SKU
- Variant (if applicable)
- Quantity
- Price
- Status