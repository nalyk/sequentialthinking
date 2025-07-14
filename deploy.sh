#!/bin/bash
# Deployment script for Sequential Thinking MCP Server
# Handles Docker container build, deployment, and management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    log_info "Loading environment from: $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
else
    log_warn "Environment file not found: $ENV_FILE"
    log_info "Using default values..."
fi

# Default configuration
CONTAINER_NAME="${CONTAINER_NAME:-mcp-sequential-thinking}"
IMAGE_NAME="${IMAGE_NAME:-mcp-sequential-thinking}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HOST_PORT="${HOST_PORT:-3001}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
MEMORY_LIMIT="${MEMORY_LIMIT:-512m}"
CPU_LIMIT="${CPU_LIMIT:-0.5}"
RESTART_POLICY="${RESTART_POLICY:-unless-stopped}"
NETWORK_MODE="${NETWORK_MODE:-bridge}"
DATA_DIR="${DATA_DIR:-/opt/mcp-data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/mcp-backups}"

# Functions
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build       Build Docker image"
    echo "  deploy      Deploy container (build + run)"
    echo "  start       Start existing container"
    echo "  stop        Stop running container"
    echo "  restart     Restart container"
    echo "  logs        Show container logs"
    echo "  shell       Open shell in container"
    echo "  status      Show container status"
    echo "  cleanup     Remove container and image"
    echo "  backup      Backup database"
    echo "  restore     Restore database from backup"
    echo "  update      Update container (backup + deploy)"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Enable verbose output"
    echo "  -f, --force    Force operation (e.g., remove existing container)"
    echo "  --no-cache     Build without cache"
    echo "  --tag TAG      Specify image tag (default: latest)"
    echo ""
    echo "Environment variables can be set in .env file"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or not accessible"
        exit 1
    fi
}

build_image() {
    local no_cache=""
    if [ "$NO_CACHE" = "true" ]; then
        no_cache="--no-cache"
    fi
    
    log_step "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    if [ "$VERBOSE" = "true" ]; then
        docker build $no_cache -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    else
        docker build $no_cache -t "${IMAGE_NAME}:${IMAGE_TAG}" . > /dev/null
    fi
    
    log_info "Image built successfully"
}

stop_container() {
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_step "Stopping container: $CONTAINER_NAME"
        docker stop "$CONTAINER_NAME" > /dev/null
        log_info "Container stopped"
    else
        log_info "Container $CONTAINER_NAME is not running"
    fi
}

remove_container() {
    if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        log_step "Removing container: $CONTAINER_NAME"
        docker rm "$CONTAINER_NAME" > /dev/null
        log_info "Container removed"
    else
        log_info "Container $CONTAINER_NAME does not exist"
    fi
}

create_directories() {
    log_step "Creating required directories"
    
    if [ ! -d "$DATA_DIR" ]; then
        log_info "Creating data directory: $DATA_DIR"
        mkdir -p "$DATA_DIR"
    fi
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

deploy_container() {
    log_step "Deploying container: $CONTAINER_NAME"
    
    create_directories
    
    # Stop and remove existing container if force is enabled
    if [ "$FORCE" = "true" ]; then
        stop_container
        remove_container
    fi
    
    # Check if container already exists
    if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        log_error "Container $CONTAINER_NAME already exists. Use --force to replace it."
        exit 1
    fi
    
    # Run container
    log_step "Starting new container"
    
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart "$RESTART_POLICY" \
        --network "$NETWORK_MODE" \
        -p "${HOST_PORT}:${CONTAINER_PORT}" \
        -v "${DATA_DIR}:/app/data" \
        --memory "$MEMORY_LIMIT" \
        --cpus "$CPU_LIMIT" \
        --health-cmd="nc -z 127.0.0.1 ${CONTAINER_PORT} || exit 1" \
        --health-interval=30s \
        --health-timeout=5s \
        --health-retries=3 \
        --health-start-period=10s \
        "${IMAGE_NAME}:${IMAGE_TAG}" > /dev/null
    
    log_info "Container deployed successfully"
    
    # Wait for container to be healthy
    log_step "Waiting for container to be healthy..."
    local attempts=0
    local max_attempts=30
    
    while [ $attempts -lt $max_attempts ]; do
        if [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" = "healthy" ]; then
            log_info "Container is healthy and ready"
            break
        fi
        
        sleep 2
        attempts=$((attempts + 1))
        
        if [ $attempts -eq $max_attempts ]; then
            log_error "Container failed to become healthy within timeout"
            show_logs
            exit 1
        fi
    done
}

start_container() {
    if ! docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        log_error "Container $CONTAINER_NAME does not exist. Use 'deploy' command first."
        exit 1
    fi
    
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_info "Container $CONTAINER_NAME is already running"
        return
    fi
    
    log_step "Starting container: $CONTAINER_NAME"
    docker start "$CONTAINER_NAME" > /dev/null
    log_info "Container started"
}

show_logs() {
    if ! docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        log_error "Container $CONTAINER_NAME does not exist"
        exit 1
    fi
    
    log_step "Showing logs for container: $CONTAINER_NAME"
    docker logs -f "$CONTAINER_NAME"
}

show_status() {
    log_step "Container Status"
    
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        echo -e "${GREEN}Status:${NC} Running"
        echo -e "${GREEN}Health:${NC} $(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo 'Unknown')"
        echo -e "${GREEN}Port:${NC} ${HOST_PORT} -> ${CONTAINER_PORT}"
        echo ""
        docker stats --no-stream "$CONTAINER_NAME"
    elif docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        echo -e "${YELLOW}Status:${NC} Stopped"
    else
        echo -e "${RED}Status:${NC} Does not exist"
    fi
}

open_shell() {
    if ! docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_error "Container $CONTAINER_NAME is not running"
        exit 1
    fi
    
    log_step "Opening shell in container: $CONTAINER_NAME"
    docker exec -it "$CONTAINER_NAME" /bin/sh
}

backup_database() {
    if ! docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_error "Container $CONTAINER_NAME is not running"
        exit 1
    fi
    
    local backup_file="${BACKUP_DIR}/sequences_$(date +%Y%m%d_%H%M%S).db"
    
    log_step "Creating database backup: $backup_file"
    
    docker exec "$CONTAINER_NAME" cat /app/data/sequences.db > "$backup_file"
    
    log_info "Database backup created successfully"
    
    # Cleanup old backups
    if [ -n "$BACKUP_RETENTION_DAYS" ]; then
        log_step "Cleaning up old backups (keeping ${BACKUP_RETENTION_DAYS} days)"
        find "$BACKUP_DIR" -name "sequences_*.db" -mtime +"$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true
    fi
}

restore_database() {
    if [ -z "$1" ]; then
        log_error "Please specify backup file to restore"
        echo "Available backups:"
        ls -la "$BACKUP_DIR"/sequences_*.db 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_step "Restoring database from: $backup_file"
    
    # Stop container if running
    local was_running=false
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        was_running=true
        stop_container
    fi
    
    # Restore database
    cp "$backup_file" "${DATA_DIR}/sequences.db"
    
    # Start container if it was running
    if [ "$was_running" = true ]; then
        start_container
    fi
    
    log_info "Database restored successfully"
}

cleanup() {
    log_step "Cleaning up container and image"
    
    stop_container
    remove_container
    
    if docker images -q "$IMAGE_NAME" | grep -q .; then
        log_step "Removing image: ${IMAGE_NAME}:${IMAGE_TAG}"
        docker rmi "${IMAGE_NAME}:${IMAGE_TAG}" > /dev/null
        log_info "Image removed"
    fi
    
    log_info "Cleanup completed"
}

update_container() {
    log_step "Updating container (backup + deploy)"
    
    # Create backup if container is running
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        backup_database
    fi
    
    # Force rebuild and deploy
    FORCE=true
    build_image
    deploy_container
    
    log_info "Container updated successfully"
}

# Parse command line arguments
VERBOSE=false
FORCE=false
NO_CACHE=false
DEBUG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        build|deploy|start|stop|restart|logs|shell|status|cleanup|backup|restore|update)
            COMMAND="$1"
            shift
            break
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check prerequisites
check_docker

# Execute command
case "${COMMAND:-}" in
    build)
        build_image
        ;;
    deploy)
        build_image
        deploy_container
        ;;
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        stop_container
        start_container
        ;;
    logs)
        show_logs
        ;;
    shell)
        open_shell
        ;;
    status)
        show_status
        ;;
    cleanup)
        cleanup
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$1"
        ;;
    update)
        update_container
        ;;
    "")
        log_error "No command specified"
        show_usage
        exit 1
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac