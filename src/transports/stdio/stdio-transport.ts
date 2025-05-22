import { BaseTransport } from '../base-transport.js';
import { Logger } from 'pino';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Implementation of the stdio transport
 * Enhances the existing StdioServerTransport from the MCP SDK
 */
export class StdioTransport extends BaseTransport {
  private stdioTransport: StdioServerTransport | null = null;
  private server: McpServer | null = null;

  /**
   * Constructor for StdioTransport
   * @param logger The logger instance
   */
  constructor(logger: Logger) {
    super('stdio', 'stdio', logger);
  }

  /**
   * Initialize the transport
   * Creates the StdioServerTransport instance
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    if (!this.isEnabled()) {
      this.logger.info('Stdio transport is disabled, skipping initialization');
      return;
    }
    
    try {
      this.stdioTransport = new StdioServerTransport();
      this.logger.info('Stdio transport initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize stdio transport');
      throw error;
    }
  }

  /**
   * Start the transport
   * Connects the transport to the server
   * @param server The MCP server instance
   */
  public async start(server: McpServer): Promise<void> {
    await super.start();
    
    if (!this.isEnabled()) {
      this.logger.info('Stdio transport is disabled, skipping start');
      return;
    }
    
    if (!this.stdioTransport) {
      throw new Error('Stdio transport not initialized');
    }
    
    try {
      this.server = server;
      await server.connect(this.stdioTransport);
      this.logger.info('Stdio transport started');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start stdio transport');
      throw error;
    }
  }

  /**
   * Stop the transport
   * Disconnects the transport from the server
   */
  public async stop(): Promise<void> {
    await super.stop();
    
    if (!this.isEnabled() || !this.stdioTransport || !this.server) {
      return;
    }
    
    try {
      // Currently, the SDK doesn't provide a way to disconnect a transport
      // This is a placeholder for future SDK versions that might support it
      this.logger.info('Stdio transport stopped');
    } catch (error) {
      this.logger.error({ error }, 'Failed to stop stdio transport');
      throw error;
    }
  }
}