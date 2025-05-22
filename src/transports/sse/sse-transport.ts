import { BaseTransport } from '../base-transport.js';
import { Logger } from 'pino';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import config from '../../config/index.js';
import fastify, { FastifyInstance } from 'fastify';

/**
 * Implementation of the SSE transport
 * NOTE: SSE transport is DEPRECATED in favor of Streamable HTTP transport
 * This implementation is maintained for backwards compatibility only
 */
export class SSETransport extends BaseTransport {
  private sseTransports: Record<string, SSEServerTransport> = {};
  private server: McpServer | null = null;
  private app: FastifyInstance | null = null;

  /**
   * Constructor for SSETransport
   * @param logger The logger instance
   */
  constructor(logger: Logger) {
    super('sse', 'sse', logger);
  }

  /**
   * Initialize the transport
   * Creates the Fastify app and SSE endpoints
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
      
      this.logger.warn('SSE transport is DEPRECATED. Consider using Streamable HTTP transport instead.');
      
      // Create Fastify app
      this.app = fastify();
      
      // SSE endpoint for establishing connection
      this.app!.get(path, async (request, reply) => {
        this.logger.debug('New SSE connection request');
        
        const transport = new SSEServerTransport('/messages', reply.raw);
        const sessionId = (transport as any).sessionId || `session-${Date.now()}`;
        this.sseTransports[sessionId] = transport;
        
        // Clean up on close
        reply.raw.on('close', () => {
          delete this.sseTransports[sessionId];
          this.logger.debug(`SSE session ${sessionId} closed`);
        });
        
        if (this.server) {
          await this.server.connect(transport);
          this.logger.debug(`SSE session ${sessionId} connected to server`);
        }
      });
      
      // Message endpoint for receiving client messages
      this.app!.post('/messages', async (request, reply) => {
        const sessionId = (request.query as any)?.sessionId as string;
        const transport = this.sseTransports[sessionId];
        
        if (transport) {
          await transport.handlePostMessage(request.raw, reply.raw, request.body);
        } else {
          reply.status(400).send({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'No transport found for sessionId'
            },
            id: null
          });
        }
      });
      
      this.logger.info(`SSE transport initialized on ${host}:${port}${path}`);
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize SSE transport');
      throw error;
    }
  }

  /**
   * Start the transport
   * Starts the Fastify server
   * @param server The MCP server instance
   */
  public async start(server: McpServer): Promise<void> {
    await super.start();
    
    if (!this.isEnabled() || !this.app) {
      this.logger.info('SSE transport is disabled, skipping start');
      return;
    }
    
    try {
      this.server = server;
      const port = config.get('transports.sse.port');
      const host = config.get('transports.sse.host');
      
      await this.app.listen({ port, host });
      this.logger.info(`SSE transport started on http://${host}:${port}`);
      
    } catch (error) {
      this.logger.error({ error }, 'Failed to start SSE transport');
      throw error;
    }
  }

  /**
   * Stop the transport
   * Stops the Fastify server and cleans up connections
   */
  public async stop(): Promise<void> {
    await super.stop();
    
    if (!this.isEnabled()) {
      return;
    }
    
    try {
      // Close all SSE connections
      for (const [sessionId] of Object.entries(this.sseTransports)) {
        delete this.sseTransports[sessionId];
      }
      
      // Close Fastify server
      if (this.app) {
        await this.app.close();
      }
      
      this.logger.info('SSE transport stopped');
    } catch (error) {
      this.logger.error({ error }, 'Failed to stop SSE transport');
      throw error;
    }
  }
}