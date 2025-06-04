import { BaseTransport } from '../base-transport.js';
import { Logger } from 'pino';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';

/**
 * Implementation of the Streamable HTTP transport
 * Uses the modern StreamableHTTPServerTransport from the MCP SDK with Fastify
 */
export class HTTPTransport extends BaseTransport {
  private transports: Record<string, StreamableHTTPServerTransport> = {};
  private server: McpServer | null = null;
  private app: FastifyInstance | null = null;

  /**
   * Constructor for HTTPTransport
   * @param logger The logger instance
   */
  constructor(logger: Logger) {
    super('http', 'http', logger);
  }

  /**
   * Initialize the transport
   * Creates the Fastify app and Streamable HTTP endpoints
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    if (!this.isEnabled()) {
      this.logger.info('HTTP transport is disabled, skipping initialization');
      return;
    }
    
    try {
      const port = parseInt(process.env.TRANSPORT_HTTP_PORT || '3001');
      const host = process.env.TRANSPORT_HTTP_HOST || 'localhost';
      const path = process.env.TRANSPORT_HTTP_PATH || '/api/mcp';
      
      // Create Fastify app  
      this.app = fastify();
      
      // Streamable HTTP endpoints - handle all methods
      this.app!.all(path, async (request, reply) => {
        await this.handleRequest(request, reply);
      });
      
      this.logger.info(`Streamable HTTP transport initialized on ${host}:${port}${path}`);
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize HTTP transport');
      throw error;
    }
  }

  /**
   * Handle all HTTP requests (POST, GET, DELETE)
   */
  private async handleRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const sessionId = request.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && this.transports[sessionId]) {
        // Reuse existing transport
        transport = this.transports[sessionId];
      } else if (!sessionId && request.method === 'POST' && isInitializeRequest(request.body)) {
        // New initialization request
        const sessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId,
          onsessioninitialized: (id) => {
            this.transports[id] = transport;
            this.logger.debug(`New HTTP session initialized: ${id}`);
          }
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (this.transports[sessionId]) {
            delete this.transports[sessionId];
            this.logger.debug(`HTTP session ${sessionId} closed`);
          }
        };

        if (this.server) {
          await this.server.connect(transport);
        }
      } else {
        // Invalid request
        reply.status(400).send({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or invalid initialization request',
          },
          id: null,
        });
        return;
      }

      // Handle the request with the transport
      await transport.handleRequest(
        request.raw, 
        reply.raw, 
        request.method === 'POST' ? request.body : undefined
      );
      
    } catch (error) {
      this.logger.error({ error }, 'Error handling HTTP request');
      
      if (!reply.sent) {
        reply.status(500).send({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
          },
          id: null,
        });
      }
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
      this.logger.info('HTTP transport is disabled, skipping start');
      return;
    }
    
    try {
      this.server = server;
      const port = parseInt(process.env.TRANSPORT_HTTP_PORT || '3001');
      const host = process.env.TRANSPORT_HTTP_HOST || 'localhost';
      
      await this.app.listen({ port, host });
      this.logger.info(`Streamable HTTP transport started on http://${host}:${port}`);
      
    } catch (error) {
      this.logger.error({ error }, 'Failed to start HTTP transport');
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
      // Close all HTTP sessions
      for (const [sessionId, transport] of Object.entries(this.transports)) {
        if (transport.onclose) {
          transport.onclose();
        }
        delete this.transports[sessionId];
      }
      
      // Close Fastify server
      if (this.app) {
        await this.app.close();
      }
      
      this.logger.info('HTTP transport stopped');
    } catch (error) {
      this.logger.error({ error }, 'Failed to stop HTTP transport');
      throw error;
    }
  }
}