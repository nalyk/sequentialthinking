#!/bin/sh
# Docker entrypoint script for Sequential Thinking MCP Server
# Handles initialization, database setup, and graceful startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1" >&2
    fi
}

# Signal handling for graceful shutdown
cleanup() {
    log_info "Received shutdown signal, performing cleanup..."
    if [ -n "$PID" ]; then
        log_info "Stopping MCP server (PID: $PID)..."
        kill -TERM "$PID" 2>/dev/null || true
        wait "$PID" 2>/dev/null || true
    fi
    log_info "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup TERM INT QUIT

# Environment setup
log_info "Starting Sequential Thinking MCP Server container..."

# Set default values for environment variables
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export HOST="${HOST:-0.0.0.0}"
export MCP_TRANSPORT="${MCP_TRANSPORT:-http}"

# Database configuration
export DB_PATH="${DB_PATH:-/app/data/sequences.db}"
DB_DIR=$(dirname "$DB_PATH")

log_info "Environment: $NODE_ENV"
log_info "Transport: $MCP_TRANSPORT"
log_info "Host: $HOST"
log_info "Port: $PORT"
log_info "Database: $DB_PATH"

# Ensure database directory exists and is writable
if [ ! -d "$DB_DIR" ]; then
    log_info "Creating database directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# Check database directory permissions
if [ ! -w "$DB_DIR" ]; then
    log_error "Database directory is not writable: $DB_DIR"
    exit 1
fi

# Database initialization check
if [ ! -f "$DB_PATH" ]; then
    log_info "Database file not found, will be created on first run: $DB_PATH"
else
    log_info "Existing database found: $DB_PATH"
    # Check database file permissions
    if [ ! -w "$DB_PATH" ]; then
        log_error "Database file is not writable: $DB_PATH"
        exit 1
    fi
fi

# Memory and resource limits (if set)
if [ -n "${MEMORY_LIMIT}" ]; then
    log_info "Memory limit: ${MEMORY_LIMIT}"
fi

# Validate required environment variables
if [ -z "$NODE_ENV" ] || [ -z "$PORT" ] || [ -z "$HOST" ]; then
    log_error "Required environment variables not set"
    exit 1
fi

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for server to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z 127.0.0.1 "$PORT" 2>/dev/null; then
            log_info "Server is ready and responding to health checks"
            return 0
        fi
        
        log_debug "Health check attempt $attempt/$max_attempts failed, retrying in 2s..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Server failed to become ready within timeout"
    return 1
}

# Start the application
log_info "Starting MCP server with command: $*"

# Execute the command in background to allow signal handling
"$@" &
PID=$!

# Wait a moment for the server to start
sleep 3

# Perform health check
if ! health_check; then
    log_error "Server startup failed"
    kill -TERM "$PID" 2>/dev/null || true
    exit 1
fi

log_info "Sequential Thinking MCP Server started successfully (PID: $PID)"

# Wait for the process to complete
wait "$PID"