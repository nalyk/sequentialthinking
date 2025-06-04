// Import pino correctly for ES modules
import { pino } from 'pino';

/**
 * Create a logger instance
 * @returns The logger instance
 */
export function createLogger() {
  // Get configuration from environment variables to avoid circular dependency
  const level = process.env.LOG_LEVEL || 'info';
  const prettyPrint = process.env.LOG_PRETTY_PRINT !== 'false';
  const stdioEnabled = process.env.TRANSPORT_STDIO_ENABLED !== 'false';
  const disableInStdio = process.env.LOG_DISABLE_IN_STDIO === 'true';
  
  // If stdio transport is enabled and logging is disabled for stdio, return a silent logger
  if (stdioEnabled && disableInStdio) {
    return pino({ level: 'silent' });
  }
  
  const loggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      app: 'sequential-thinking',
      version: process.env.SERVER_VERSION || '2.0.0'
    }
  };
  
  // If stdio transport is enabled, we must send logs to stderr to avoid corrupting stdout JSON-RPC
  if (stdioEnabled) {
    if (prettyPrint) {
      return pino({
        ...loggerOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            destination: 2, // stderr
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      });
    }
    
    // For stdio mode without pretty print, send structured logs to stderr
    return pino({
      ...loggerOptions
    }, pino.destination(2)); // stderr
  }
  
  // For non-stdio modes, use normal stdout logging
  if (prettyPrint) {
    return pino({
      ...loggerOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    });
  }
  
  return pino(loggerOptions);
}

/**
 * Create a child logger with a specific context
 * @param parent The parent logger
 * @param context The context for the child logger
 * @returns The child logger
 */
export function createChildLogger(parent: any, context: string) {
  return parent.child({ context });
}

/**
 * Default logger instance
 */
export const logger = createLogger();