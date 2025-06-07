/**
 * Transport interface for MCP server
 * This interface defines the common methods that all transport implementations must provide
 */
export interface Transport {
  /**
   * Initialize the transport
   * @returns Promise that resolves when the transport is initialized
   */
  initialize(): Promise<void>;

  /**
   * Start the transport
   * @param server Optional MCP server instance to connect to
   * @returns Promise that resolves when the transport is started
   */
  start(server?: any): Promise<void>;

  /**
   * Stop the transport
   * @returns Promise that resolves when the transport is stopped
   */
  stop(): Promise<void>;

  /**
   * Get the name of the transport
   * @returns The name of the transport
   */
  getName(): string;

  /**
   * Get the type of the transport
   * @returns The type of the transport (stdio, sse, http)
   */
  getType(): 'stdio' | 'sse' | 'http';

  /**
   * Check if the transport is enabled
   * @returns True if the transport is enabled, false otherwise
   */
  isEnabled(): boolean;
}
