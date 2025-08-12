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

### LLM Agent (Recommended)
Run the interactive LLM agent:
```bash
npm run agent
```

This starts a chat interface where you can:
- Ask to fetch inventory: "Fetch my latest inventory"
- Ask questions: "How many products do I have?"
- Get analysis: "Which products are low in stock?"
- Check values: "What's my total inventory value?"

### As MCP Server
Run with MCP client:
```bash
npm start
```

### Manual Testing
```bash
npm run dev
```

## MCP Tools

- `sync_inventory`: Fetches all active products from Shopify and saves to Excel
  - Optional parameter: `output_path` (defaults to ./inventory.xlsx)
- `read_inventory`: Reads and analyzes inventory data from Excel file
  - Optional parameter: `file_path` (defaults to ./inventory.xlsx)

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