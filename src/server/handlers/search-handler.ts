export async function handleSearch(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Search is handled by RAG service in the LLM agent, not MCP server
  return {
    content: [{
      type: 'text',
      text: 'Search operations are handled by the RAG service. Please use the LLM agent for search queries.',
    }],
    isError: true,
  };
}