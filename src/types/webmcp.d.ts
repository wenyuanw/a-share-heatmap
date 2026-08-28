type WebMcpJsonSchema = Record<string, unknown>;

interface WebMcpToolExecuteOptions {
  signal: AbortSignal;
}

interface WebMcpToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: WebMcpJsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: Record<string, unknown>,
    options: WebMcpToolExecuteOptions
  ) => unknown | Promise<unknown>;
}

interface WebMcpRegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

interface WebMcpModelContext {
  registerTool(
    tool: WebMcpToolDefinition,
    options?: WebMcpRegisterToolOptions
  ): Promise<void>;
}

interface Document {
  readonly modelContext?: WebMcpModelContext;
}
