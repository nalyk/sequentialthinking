import convict from 'convict';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
dotenv.config();

// Get package.json for dynamic version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

/**
 * Configuration schema for the application
 */
const configSchema = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  server: {
    name: {
      doc: 'The name of the server',
      format: String,
      default: packageJson.name || 'Sequential Thinking MCP Server',
      env: 'SERVER_NAME'
    },
    version: {
      doc: 'The version of the server',
      format: String,
      default: packageJson.version || '2.0.0',
      env: 'SERVER_VERSION'
    }
  },
  logging: {
    level: {
      doc: 'The logging level',
      format: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    prettyPrint: {
      doc: 'Whether to pretty print logs',
      format: Boolean,
      default: true,
      env: 'LOG_PRETTY_PRINT'
    },
    disableInStdio: {
      doc: 'Whether to disable logging completely when stdio transport is enabled',
      format: Boolean,
      default: false,
      env: 'LOG_DISABLE_IN_STDIO'
    }
  },
  session: {
    ttl: {
      doc: 'The time-to-live for sessions in seconds',
      format: 'nat',
      default: 3600,
      env: 'SESSION_TTL'
    },
    checkPeriod: {
      doc: 'The period to check for expired sessions in seconds',
      format: 'nat',
      default: 60,
      env: 'SESSION_CHECK_PERIOD'
    }
  },
  transports: {
    stdio: {
      enabled: {
        doc: 'Whether the stdio transport is enabled',
        format: Boolean,
        default: true,
        env: 'TRANSPORT_STDIO_ENABLED'
      }
    },
    sse: {
      enabled: {
        doc: 'Whether the SSE transport is enabled',
        format: Boolean,
        default: false,
        env: 'TRANSPORT_SSE_ENABLED'
      },
      host: {
        doc: 'The host for the SSE transport',
        format: String,
        default: 'localhost',
        env: 'TRANSPORT_SSE_HOST'
      },
      port: {
        doc: 'The port for the SSE transport',
        format: 'port',
        default: 3000,
        env: 'TRANSPORT_SSE_PORT'
      },
      path: {
        doc: 'The path for the SSE transport',
        format: String,
        default: '/sse',
        env: 'TRANSPORT_SSE_PATH'
      }
    },
    http: {
      enabled: {
        doc: 'Whether the HTTP transport is enabled',
        format: Boolean,
        default: false,
        env: 'TRANSPORT_HTTP_ENABLED'
      },
      host: {
        doc: 'The host for the HTTP transport',
        format: String,
        default: 'localhost',
        env: 'TRANSPORT_HTTP_HOST'
      },
      port: {
        doc: 'The port for the HTTP transport',
        format: 'port',
        default: 3001,
        env: 'TRANSPORT_HTTP_PORT'
      },
      path: {
        doc: 'The path for the HTTP transport',
        format: String,
        default: '/api/mcp',
        env: 'TRANSPORT_HTTP_PATH'
      }
    }
  }
});

// Validate the configuration
configSchema.validate({ allowed: 'strict' });

// Export the configuration
export default configSchema;