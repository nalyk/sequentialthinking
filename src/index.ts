import { SequentialThinkingServer } from './server.js';
import { logger } from './logging/logger.js';

/**
 * Main entry point for the Sequential Thinking MCP Server
 */
async function main() {
  try {
    logger.info(`Starting Sequential Thinking MCP Server v${process.env.SERVER_VERSION || '2.0.0'}`);
    
    // Create server instance
    const server = new SequentialThinkingServer();
    
    // Initialize server
    await server.initialize();
    
    // Start server
    await server.start();
    
    // Handle process signals
    setupSignalHandlers(server);
    
    logger.info('Sequential Thinking MCP Server is running');
  } catch (error) {
    logger.error({ error }, 'Failed to start Sequential Thinking MCP Server');
    process.exit(1);
  }
}

/**
 * Set up signal handlers for graceful shutdown
 * @param server The server instance
 */
function setupSignalHandlers(server: SequentialThinkingServer) {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal, shutting down...');
    await shutdown(server);
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal, shutting down...');
    await shutdown(server);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error({ error }, 'Uncaught exception, shutting down...');
    await shutdown(server);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection, shutting down...');
    await shutdown(server);
  });
}

/**
 * Shutdown the server gracefully
 * @param server The server instance
 */
async function shutdown(server: SequentialThinkingServer) {
  try {
    logger.info('Shutting down Sequential Thinking MCP Server...');
    
    // Stop the server
    await server.stop();
    
    logger.info('Sequential Thinking MCP Server stopped');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Start the server
main();
