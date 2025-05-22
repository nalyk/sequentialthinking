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
  
  const loggerOptions = {
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      app: 'sequential-thinking',
      version: config.get('server.version')
    }
  };
  
  // Add pretty printing if enabled
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