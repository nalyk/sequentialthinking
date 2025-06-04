import { Transport } from './transport.interface.js';
import { Logger } from 'pino';

/**
 * Factory for creating transport instances
 * Implements the factory pattern for transport creation
 */
export class TransportFactory {
  private logger: Logger;

  /**
   * Constructor for TransportFactory
   * @param logger The logger instance
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create all enabled transports
   * @returns Promise that resolves to an array of enabled transports
   */
  public async createEnabledTransports(): Promise<Transport[]> {
    const transports: Transport[] = [];
    
    // Check if stdio transport is enabled
    if (process.env.TRANSPORT_STDIO_ENABLED !== 'false') {
      try {
        const StdioTransport = (await import('./stdio/stdio-transport.js')).StdioTransport;
        const stdioTransport = new StdioTransport(this.logger);
        transports.push(stdioTransport);
        this.logger.info('Stdio transport created');
      } catch (error) {
        this.logger.error({ error }, 'Failed to create stdio transport');
      }
    }
    
    // Check if SSE transport is enabled
    if (process.env.TRANSPORT_SSE_ENABLED === 'true') {
      try {
        const SSETransport = (await import('./sse/sse-transport.js')).SSETransport;
        const sseTransport = new SSETransport(this.logger);
        transports.push(sseTransport);
        this.logger.info('SSE transport created');
      } catch (error) {
        this.logger.error({ error }, 'Failed to create SSE transport');
      }
    }
    
    // Check if HTTP transport is enabled
    if (process.env.TRANSPORT_HTTP_ENABLED === 'true') {
      try {
        const HTTPTransport = (await import('./http/http-transport.js')).HTTPTransport;
        const httpTransport = new HTTPTransport(this.logger);
        transports.push(httpTransport);
        this.logger.info('HTTP transport created');
      } catch (error) {
        this.logger.error({ error }, 'Failed to create HTTP transport');
      }
    }
    
    return transports;
  }

  /**
   * Create a specific transport by type
   * @param type The type of transport to create
   * @returns Promise that resolves to the created transport, or null if creation fails
   */
  public async createTransport(type: 'stdio' | 'sse' | 'http'): Promise<Transport | null> {
    try {
      switch (type) {
        case 'stdio':
          const StdioTransport = (await import('./stdio/stdio-transport.js')).StdioTransport;
          return new StdioTransport(this.logger);
        
        case 'sse':
          const SSETransport = (await import('./sse/sse-transport.js')).SSETransport;
          return new SSETransport(this.logger);
        
        case 'http':
          const HTTPTransport = (await import('./http/http-transport.js')).HTTPTransport;
          return new HTTPTransport(this.logger);
        
        default:
          this.logger.error(`Unknown transport type: ${type}`);
          return null;
      }
    } catch (error) {
      this.logger.error({ error }, `Failed to create transport of type ${type}`);
      return null;
    }
  }
}