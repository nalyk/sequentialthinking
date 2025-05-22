import config from '../config/index.js';
// Import pino correctly for ES modules
import { pino } from 'pino';

/**
 * Create a logger instance
 * @returns The logger instance
 */
export function createLogger() {
  const level = config.get('logging.level');
  const prettyPrint = config.get('logging.prettyPrint');
  const stdioEnabled = config.get('transports.stdio.enabled');
  const disableInStdio = config.get('logging.disableInStdio');
  
  // If stdio transport is enabled and logging is disabled for stdio, return a silent logger
  if (stdioEnabled && disableInStdio) {
    return pino({ level: 'silent' });
  }
  
  const loggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      app: 'sequential-thinking',
      version: config.get('server.version')
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