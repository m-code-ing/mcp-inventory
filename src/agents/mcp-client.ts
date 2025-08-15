import path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(): Promise<void> {
    if (this.client) return;

    const serverPath = path.resolve(process.cwd(), 'dist/server/index.js');
    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined)
    ) as Record<string, string>;

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
    });

    this.client = new Client({ name: 'inventory-agent-client', version: '1.0.0' });
    await this.client.connect(this.transport);
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
    if (!this.client) throw new Error('MCP client not connected');

    const res = await this.client.callTool({ name, arguments: args });
    const content = (res as any).content;

    if (Array.isArray(content) && content.length) {
      const first = content[0] as { text?: string };
      if (typeof first?.text === 'string') return first.text;
    }
    return 'No result returned from server';
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
