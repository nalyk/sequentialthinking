# Multi-stage production Dockerfile for Sequential Thinking MCP Server
# Based on Node.js TypeScript best practices for 2025

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for SQLite and native modules
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build) - skip prepare script
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Verify TypeScript compiler is available
RUN npx tsc --version

# Build the TypeScript application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install production system dependencies including build tools for SQLite3
RUN apk add --no-cache sqlite python3 make g++ sqlite-dev

# Create app directory
WORKDIR /app

# Use existing node user (UID 1000 to match host ubuntu user)
# No need to create a new user as node user already exists with UID 1000

# Copy package files
COPY package*.json ./

# Install production dependencies (skip scripts to avoid TypeScript compilation)
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/CLAUDE.md ./CLAUDE.md

# Rebuild SQLite3 with proper native bindings
RUN npm rebuild sqlite3

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown -R node:node /app && \
    chmod 755 /app/data

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z 127.0.0.1 3000 || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]

# Default command
CMD ["node", "dist/index.js", "--transport", "http", "--host", "0.0.0.0", "--port", "3000"]
