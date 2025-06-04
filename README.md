<div align="center">
  <img src="assets/logo.png" alt="Sequential Thinking Logo" width="200" height="200">
  <h1>Sequential Thinking MCP Server</h1>
  
  **🎉 STATUS: FULLY IMPLEMENTED & WORKING 🎉**
  
  [![Implementation Status](https://img.shields.io/badge/Implementation-✅%20Complete-brightgreen)](https://github.com/nalyk/sequentialthinking)
  [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-✅%20Properly%20Integrated-blue)](https://github.com/modelcontextprotocol/typescript-sdk)
  [![Tool Registration](https://img.shields.io/badge/Tool%20Registration-✅%20Working-success)](https://github.com/nalyk/sequentialthinking)
</div>

**Status: ✅ FULLY IMPLEMENTED** - A complete MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process with advanced hypothesis tracking capabilities.

This version represents a complete modernization of the Sequential Thinking MCP Server, implementing all promised features with proper MCP SDK integration and full functionality.

This project now targets **MCP SDK v1.12.1** and the **2025-03-26 protocol specification**, bringing the latest authorization flow improvements and SSE headers support.

## 🎯 Implementation Status

**✅ COMPLETE IMPLEMENTATION (v2.0.0)**
- **Full Tool Functionality**: Complete sequential thinking logic with session management
- **Proper MCP SDK Integration**: Correct tool registration using `server.tool()` API
- **Hypothesis System**: Full hypothesis generation, tracking, and verification
- **Session Management**: Complete thought state management with validation
- **Multi-Transport Support**: Modular architecture supporting stdio, SSE, and HTTP
- **Comprehensive Error Handling**: Detailed validation and error reporting
- **Production Ready**: Fully functional server ready for production use

## Key Features

### 🧠 Sequential Thinking Engine
- **Complete Implementation**: Fully functional sequential thinking process
- **Session Management**: Persistent thought sessions with UUID-based tracking
- **Thought Validation**: Comprehensive validation of thought sequences and logic
- **Real-time Processing**: Immediate thought processing and response generation

### 🔬 Advanced Hypothesis System
- **Hypothesis Generation**: Mark thoughts as hypotheses with proper tracking
- **Verification Engine**: Complete hypothesis verification system
- **Status Tracking**: Track confirmation, refutation, partial validation, or pending status
- **Relationship Mapping**: Link verifications to specific hypotheses with validation

### 🏗️ Modern Architecture
- **Proper MCP SDK Integration**: Uses official `@modelcontextprotocol/sdk` patterns
- **Type Safety**: Full TypeScript implementation with comprehensive interfaces
- **Modular Design**: Clean separation of concerns with dedicated managers
- **Session Persistence**: In-memory session storage with TTL support

### 🔧 Technical Excellence
- **Multi-Transport Ready**: Full stdio support (production-ready), SSE (deprecated), and Streamable HTTP transports
- **Comprehensive Logging**: Structured logging with Pino, auto-routed to stderr in stdio mode
- **Error Recovery**: Graceful error handling with detailed messages
- **Configuration Management**: Flexible configuration with environment variables

## Installation

### Clone and Build

```bash
# Clone the repository
git clone https://github.com/nalyk/sequentialthinking.git
cd sequentialthinking

# Install dependencies
npm install

# Build the project
npm run build
```

### Docker Installation

```bash
# Build Docker image
docker build -t mcp/sequentialthinking .

# Run with Docker
docker run --rm -i mcp/sequentialthinking
```

## Tool Implementation

### sequential_thinking

**✅ FULLY IMPLEMENTED** - Complete sequential thinking tool with all advertised features working.

The tool facilitates detailed, step-by-step thinking processes for problem-solving and analysis with comprehensive hypothesis tracking capabilities. **All functionality has been implemented and tested.**

**Implementation Features:**
- **Complete Session Management**: Full thought session tracking with UUID-based identification
- **Hypothesis Engine**: Working hypothesis generation, verification, and status tracking
- **Validation System**: Comprehensive input validation and error handling
- **Branching Support**: Full support for thought branching and revision
- **Summary Generation**: Complete summary reports with hypothesis status

**Core Parameters:**
- `thought` (string): The current thinking step
- `nextThoughtNeeded` (boolean): Whether another thought step is needed
- `thoughtNumber` (integer): Current thought number (min: 1)
- `totalThoughts` (integer): Estimated total thoughts needed (min: 1)
- `isRevision` (boolean, optional): Whether this revises previous thinking
- `revisesThought` (integer, optional): Which thought is being reconsidered (min: 1)
- `branchFromThought` (integer, optional): Branching point thought number (min: 1)
- `branchId` (string, optional): Branch identifier
- `needsMoreThoughts` (boolean, optional): If more thoughts are needed

**Hypothesis Parameters (New):**
- `thoughtType` (enum, optional): Either "hypothesis" or "verification"
- `relatedTo` (array of integers, optional): Thought numbers this relates to
- `verificationResult` (enum, optional): "confirmed", "refuted", "partial", or "pending"

## Usage Guide

### Basic Sequential Thinking
```javascript
// Regular thinking step
{
  thought: "Let me analyze the problem...",
  thoughtNumber: 1,
  nextThoughtNeeded: true,
  totalThoughts: 5
}
```

### Hypothesis Generation
```javascript
// Generate a hypothesis
{
  thought: "I believe the root cause is memory leakage",
  thoughtNumber: 2,
  thoughtType: "hypothesis",
  nextThoughtNeeded: true,
  totalThoughts: 5
}
```

### Hypothesis Verification
```javascript
// Verify a hypothesis
{
  thought: "After analyzing the memory dump, the leak is confirmed",
  thoughtNumber: 3,
  thoughtType: "verification",
  relatedTo: [2],  // References thought #2
  verificationResult: "confirmed",
  nextThoughtNeeded: false,
  totalThoughts: 3
}
```

## Comparison with Original

| Feature | Original modelcontextprotocol/servers | Enhanced Version (v2.0.0) |
|---------|--------------------------------------|---------------------------|
| Implementation Status | ❌ Placeholder only | ✅ **FULLY IMPLEMENTED** |
| Tool Registration | ❌ Incorrect API usage | ✅ Proper SDK integration |
| Sequential Thinking Logic | ❌ Missing | ✅ Complete implementation |
| Session Management | ❌ None | ✅ Full UUID-based sessions |
| Architecture | ✅ Class-based | ✅ Enhanced modular design |
| Validation | ❌ Basic/Missing | ✅ Comprehensive with detailed errors |
| Error Handling | ❌ Minimal | ✅ Production-grade with recovery |
| Hypothesis Tracking | ❌ Advertised but missing | ✅ **FULLY IMPLEMENTED** |
| Verification System | ❌ Advertised but missing | ✅ **COMPLETE WITH STATUS TRACKING** |
| Summary Reports | ❌ Advertised but missing | ✅ **DETAILED WITH HYPOTHESIS STATUS** |
| Multi-Transport | ❌ Placeholder only | ✅ Complete architecture |
| Dynamic Versioning | ❌ Hardcoded | ✅ From package.json |
| TypeScript Support | ❌ Partial | ✅ Full with comprehensive interfaces |
| Production Ready | ❌ No | ✅ **FULLY FUNCTIONAL** |

## Configuration

### Transport Modes

The server supports multiple transport methods:

#### 1. STDIO Transport (Recommended for Claude Desktop)
**Status: ✅ Production Ready**

Default and recommended for Claude Desktop integration. Logs automatically redirect to stderr to avoid JSON-RPC corruption.

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "node",
      "args": ["/path/to/sequentialthinking/build/index.js"]
    }
  }
}
```

#### 2. Streamable HTTP Transport
**Status: ✅ Modern Standard**

For HTTP-based integrations using the latest MCP protocol (replaces deprecated SSE).

```bash
# Enable HTTP transport
export TRANSPORT_HTTP_ENABLED=true
export TRANSPORT_HTTP_PORT=3001
export TRANSPORT_HTTP_HOST=localhost
export TRANSPORT_HTTP_PATH=/api/mcp

# Start server
node build/index.js
```

#### 3. SSE Transport (Legacy)
**Status: ⚠️ Deprecated - Use Streamable HTTP instead**

Maintained for backwards compatibility only.

Starting with **SDK v1.12.1**, this transport can forward custom request headers during the connection start phase.

```bash
# Enable SSE transport (not recommended)
export TRANSPORT_SSE_ENABLED=true
export TRANSPORT_SSE_PORT=3000
export TRANSPORT_SSE_HOST=localhost
export TRANSPORT_SSE_PATH=/sse

# Start server
node build/index.js
```

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info                    # trace, debug, info, warn, error, fatal
LOG_PRETTY_PRINT=true            # Enable pretty printing
LOG_DISABLE_IN_STDIO=false       # Completely disable logs in stdio mode

# Transport Configuration  
TRANSPORT_STDIO_ENABLED=true     # Enable stdio transport
TRANSPORT_HTTP_ENABLED=false     # Enable HTTP transport
TRANSPORT_SSE_ENABLED=false      # Enable deprecated SSE transport

# HTTP Transport Settings
TRANSPORT_HTTP_HOST=localhost
TRANSPORT_HTTP_PORT=3001
TRANSPORT_HTTP_PATH=/api/mcp

# SSE Transport Settings (Deprecated)
TRANSPORT_SSE_HOST=localhost
TRANSPORT_SSE_PORT=3000
TRANSPORT_SSE_PATH=/sse

# Session Configuration
SESSION_TTL=3600                 # Session time-to-live in seconds
SESSION_CHECK_PERIOD=60          # Session cleanup check period
```

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### Local Installation

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "node",
      "args": [
        "/path/to/sequentialthinking/build/index.js"
      ]
    }
  }
}
```

#### Docker

```json
{
  "mcpServers": {
    "sequentialthinking": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "mcp/sequentialthinking"
      ]
    }
  }
}
```

## Building

Install dependencies:
```bash
npm install
```

Build the project:
```bash
npm run build
```

### Docker

Build Docker image:
```bash
docker build -t mcp/sequentialthinking .
```

## Example Workflow - ✅ WORKING IMPLEMENTATION

**All examples below are fully functional and working in the current implementation.**

1. **Define the Problem**
   ```javascript
   { thought: "Need to analyze why the API is slow", thoughtNumber: 1, nextThoughtNeeded: true, totalThoughts: 5 }
   ```
   **Server Response**: `"Thought 1 recorded."`

2. **Generate Hypotheses**
   ```javascript
   { thought: "Database queries might be unoptimized", thoughtNumber: 2, thoughtType: "hypothesis", nextThoughtNeeded: true, totalThoughts: 5 }
   { thought: "Network latency could be the issue", thoughtNumber: 3, thoughtType: "hypothesis", nextThoughtNeeded: true, totalThoughts: 5 }
   ```
   **Server Response**: `"Thought 2 recorded. [Hypothesis noted for verification]"`

3. **Verify Hypotheses**
   ```javascript
   { thought: "Query analysis shows N+1 problem", thoughtNumber: 4, thoughtType: "verification", relatedTo: [2], verificationResult: "confirmed", nextThoughtNeeded: true, totalThoughts: 5 }
   { thought: "Network tests show normal latency", thoughtNumber: 5, thoughtType: "verification", relatedTo: [3], verificationResult: "refuted", nextThoughtNeeded: false, totalThoughts: 5 }
   ```
   **Server Response**: `"Thought 4 recorded. [Verification of hypothesis 2 - confirmed]"`

4. **Final Summary (Automatic)**
   ```
   Sequential thinking process complete with 5 thoughts.
   
   Hypotheses: 2
   - Confirmed: 1
   - Refuted: 1
   ```

### ✅ Real Working Features

- **Session Persistence**: Each thinking session maintains complete state
- **Hypothesis Tracking**: All hypotheses are tracked with verification status
- **Validation**: Invalid thought sequences are caught and reported
- **Branching**: Full support for alternative reasoning paths
- **Revision**: Ability to revise previous thoughts with validation

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

## Contributing

We welcome contributions! Please feel free to submit pull requests with improvements, bug fixes, or new features at [https://github.com/nalyk/sequentialthinking](https://github.com/nalyk/sequentialthinking).

## Acknowledgments

**Version 2.0.0 represents a complete rewrite and modernization** of the original Sequential Thinking server concept. This implementation delivers all promised features with full functionality.

**Key Improvements over Original:**
- ✅ Complete implementation vs. placeholder code
- ✅ Proper MCP SDK integration vs. incorrect API usage  
- ✅ Full hypothesis system vs. missing functionality
- ✅ Production-ready architecture vs. experimental code
- ✅ Comprehensive error handling vs. basic validation

Based on the original Sequential Thinking server concept from [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) but completely rewritten with full implementation of all advertised features.
