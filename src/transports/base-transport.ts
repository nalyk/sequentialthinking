import { Transport } from './transport.interface.js';
import { Logger } from 'pino';

/**
 * Abstract base class for all transport implementations
 * Provides common functionality for all transports
 */
export abstract class BaseTransport implements Transport {
  protected name: string;
  protected type: 'stdio' | 'sse' | 'http';
  protected enabled: boolean;
  protected logger: Logger;

  /**
   * Constructor for BaseTransport
   * @param name The name of the transport
   * @param type The type of the transport
   * @param logger The logger instance
   */
  constructor(name: string, type: 'stdio' | 'sse' | 'http', logger: Logger) {
    this.name = name;
    this.type = type;
    this.logger = logger;
    
    // Get enabled status from configuration
    this.enabled = this.getEnabledFromConfig();
    
    this.logger.debug(`Transport ${name} (${type}) created, enabled: ${this.enabled}`);
  }

  /**
   * Initialize the transport
   * This method should be overridden by subclasses
   */
  public async initialize(): Promise<void> {
    this.logger.debug(`Initializing transport ${this.name} (${this.type})`);
  }

  /**
   * Start the transport
   * This method should be overridden by subclasses
   * @param server Optional MCP server instance to connect to
   */
  public async start(server?: any): Promise<void> {
    this.logger.debug(`Starting transport ${this.name} (${this.type})`);
  }

  /**
   * Stop the transport
   * This method should be overridden by subclasses
   */
  public async stop(): Promise<void> {
    this.logger.debug(`Stopping transport ${this.name} (${this.type})`);
  }

  /**
   * Get the name of the transport
   * @returns The name of the transport
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the type of the transport
   * @returns The type of the transport
   */
  public getType(): 'stdio' | 'sse' | 'http' {
    return this.type;
  }

  /**
   * Check if the transport is enabled
   * @returns True if the transport is enabled, false otherwise
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the enabled status from configuration
   * @returns True if the transport is enabled, false otherwise
   */
  private getEnabledFromConfig(): boolean {
    switch (this.type) {
      case 'stdio':
        return process.env.TRANSPORT_STDIO_ENABLED !== 'false';
      case 'sse':
        return process.env.TRANSPORT_SSE_ENABLED === 'true';
      case 'http':
        return process.env.TRANSPORT_HTTP_ENABLED === 'true';
      default:
        return false;
    }
  }
}
