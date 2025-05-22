import { BaseTransport } from '../base-transport.js';
import { Logger } from 'pino';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import config from '../../config/index.js';

/**
 * Implementation of the SSE transport
 * Uses the SSEServerTransport from the MCP SDK
 */
export class SSETransport extends BaseTransport {
  private sseTransport: SSEServerTransport | null = null;
  private server: McpServer | null = null;

  /**
   * Constructor for SSETransport
   * @param logger The logger instance
   */
  constructor(logger: Logger) {
    super('sse', 'sse', logger);
  }

  /**
   * Initialize the transport
   * Creates the SSEServerTransport instance
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    if (!this.isEnabled()) {
      this.logger.info('SSE transport is disabled, skipping initialization');
      return;
    }
    
    try {
      const port = config.get('transports.sse.port');
      const host = config.get('transports.sse.host');
      const path = config.get('transports.sse.path');
      
      // TODO: The SSEServerTransport constructor requires parameters that we need to investigate
      // For now, we'll create a placeholder and add proper implementation later
      this.logger.warn('SSE transport initialization is not fully implemented yet');
      this.logger.info(`SSE transport would be configured with port: ${port}, host: ${host}, path: ${path}`);
      
      // Placeholder for the actual implementation
      // this.sseTransport = new SSEServerTransport(...);
      
      // For now, we'll mark this as initialized but not functional
      this.enabled = false;
      
      this.logger.info(`SSE transport initialized on ${host}:${port}${path}`);
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize SSE transport');
      throw error;
    }
  }

  /**
   * Start the transport
   * Connects the transport to the server
   * @param server The MCP server instance
   */
  public async start(server: McpServer): Promise<void> {
    await super.start(server);
    
    if (!this.isEnabled()) {
      this.logger.info('SSE transport is disabled, skipping start');
      return;
    }
    
    if (!this.sseTransport) {
      throw new Error('SSE transport not initialized');
    }
    
    try {
      this.server = server;
      await server.connect(this.sseTransport);
      this.logger.info('SSE transport started');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start SSE transport');
      throw error;
    }
  }

  /**
   * Stop the transport
   * Disconnects the transport from the server
   */
  public async stop(): Promise<void> {
    await super.stop();
    
    if (!this.isEnabled() || !this.sseTransport || !this.server) {
      return;
    }
    
    try {
      // Currently, the SDK doesn't provide a way to disconnect a transport
      // This is a placeholder for future SDK versions that might support it
      this.logger.info('SSE transport stopped');
    } catch (error) {
      this.logger.error({ error }, 'Failed to stop SSE transport');
      throw error;
    }
  }
}