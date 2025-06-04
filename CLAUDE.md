# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `/build`
- **Development**: `npm run dev` - Watch mode compilation
- **Test**: `npm test` - Run Jest tests
- **Start**: `npm start` - Run the built server

## Important Notes

- **Configuration**: The app uses environment variables directly to avoid circular dependencies
- **Logging**: Logs are automatically sent to stderr in stdio mode to avoid JSON-RPC corruption
- **Tool Registration**: Uses MCP SDK v1.12.1 with proper tool registration format
- **Visual Output**: Chalk provides colorful, bordered visual formatting on stderr
- **Enhanced Responses**: All responses include structured JSON metadata for session tracking

## Key Features

### Visual Excellence
- Beautiful colored boxes with emojis for different thought types:
  - 💭 Regular thoughts
  - 🔬 Hypotheses 
  - ✅ Verifications
  - 🔄 Revisions
  - 🌿 Branches

### Advanced Capabilities
- **Dynamic Total Adjustment**: Automatically adjusts totalThoughts as thinking evolves
- **Rich Metadata**: Every response includes session state, branches, thought history
- **Hypothesis Tracking**: Complete hypothesis generation and verification workflow
- **Branch Management**: Support for alternative reasoning paths with unique IDs
- **Revision System**: Ability to revise and improve previous thoughts
- **Comprehensive Summaries**: Detailed final reports with all session analytics

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides a structured sequential thinking tool with hypothesis tracking capabilities.

### Core Components

- **Server** (`src/server.ts`): Main MCP server using `@modelcontextprotocol/sdk`
- **Sequential Thinking Manager** (`src/tools/sequential-thinking-manager.ts`): Core business logic for thought processing, session management, and hypothesis tracking
- **Transport Layer** (`src/transports/`): Multi-transport architecture supporting stdio (primary), HTTP, and deprecated SSE
- **Session Manager** (`src/session/session-manager.ts`): Manages thinking sessions with UUID-based tracking
- **Types** (`src/types/thinking.ts`): TypeScript interfaces for thought states and sessions

### Key Patterns

- **Tool Registration**: Uses `server.tool()` with Zod schemas for parameter validation
- **Session-based Architecture**: Each thinking process runs in an isolated session with UUID tracking
- **Hypothesis System**: Thoughts can be marked as hypotheses and later verified with status tracking
- **Transport Abstraction**: Modular transport system with factory pattern for stdio/HTTP/SSE support

### Configuration System

Uses `convict` for configuration management with environment variable support. Key areas:
- Transport selection (STDIO primary, HTTP/SSE optional)
- Logging configuration with Pino
- Session TTL and cleanup settings

### Entry Points

- `src/index.ts`: Main entry point with signal handling and graceful shutdown
- `src/server.ts`: Core MCP server implementation
- Binary: `build/index.js` (after compilation)

### Testing

Uses Jest with ts-jest for ESM support. Test files follow pattern `*.test.ts` in `/tests`.