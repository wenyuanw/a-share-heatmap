export function withWebMcpErrorBoundary(tool: WebMcpToolDefinition): WebMcpToolDefinition {
  return {
    ...tool,
    execute: async (input, options) => {
      try {
        return await tool.execute(input, options);
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "WebMCP tool execution failed.",
        };
      }
    },
  };
}
