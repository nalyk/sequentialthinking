<div align="center">
  <img src="assets/logo.png" alt="Sequential Thinking Logo" width="200" height="200">
  <h1>Sequential Thinking MCP Server</h1>
  
  **🎉 STATUS: ENHANCED & PRODUCTION-READY 🎉**
  
  [![Implementation Status](https://img.shields.io/badge/Implementation-🚀%20Enhanced-brightgreen)](https://github.com/nalyk/sequentialthinking)
  [![Visual UX](https://img.shields.io/badge/Visual%20UX-🎨%20Beautiful-purple)](https://github.com/nalyk/sequentialthinking)
  [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-✅%20v1.12.1-blue)](https://github.com/modelcontextprotocol/typescript-sdk)
  [![Tool Registration](https://img.shields.io/badge/Tool%20Registration-✅%20Working-success)](https://github.com/nalyk/sequentialthinking)
</div>

**Status: 🚀 ENHANCED & PRODUCTION-READY** - A **drastically improved** MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process with advanced hypothesis tracking, **beautiful visual formatting**, and **enterprise-grade features**.

This version represents a **revolutionary enhancement** of the Sequential Thinking MCP Server, implementing all promised features with proper MCP SDK integration, **visual excellence**, and **maximum effectiveness**.

This project now targets **MCP SDK v1.12.1** and the **2025-03-26 protocol specification**, bringing the latest authorization flow improvements, **visual formatting with Chalk**, and **rich metadata responses**.

## 🎯 Implementation Status

**🚀 ENHANCED IMPLEMENTATION (v2.0.0)**
- **🎨 Visual Excellence**: Beautiful colored formatting with chalk, emojis, and bordered boxes
- **📊 Rich Metadata**: Structured JSON responses with session state, branches, and analytics
- **🔧 Dynamic Adjustment**: Automatic totalThoughts adjustment as thinking evolves
- **🧠 Advanced Thinking**: Complete sequential thinking logic with enhanced session management
- **✅ Proper MCP SDK Integration**: Correct tool registration using latest `server.tool()` API
- **🔬 Hypothesis System**: Full hypothesis generation, tracking, verification, and status reporting
- **💾 Session Management**: Complete thought state management with UUID-based tracking
- **🌐 Multi-Transport Support**: Modular architecture supporting stdio, SSE, and HTTP
- **🛡️ Comprehensive Error Handling**: Production-grade error handling with structured responses
- **🚀 Enterprise Ready**: Maximum effectiveness with professional-grade features

## Key Features

### 🎨 Visual Excellence
- **Beautiful Output**: Colored, bordered boxes with emojis for different thought types
  - 💭 Regular thoughts
  - 🔬 Hypotheses 
  - ✅ Verifications
  - 🔄 Revisions
  - 🌿 Branches
- **Professional Presentation**: Clean, readable format that makes complex thinking visually intuitive
- **Debug-Friendly**: Visual stderr output for easy development and troubleshooting

### 📊 Enhanced Responses
- **Rich Metadata**: Every response includes structured JSON with session analytics
- **Session State**: Complete thought history, branch tracking, hypothesis status
- **Progress Tracking**: Real-time session progress with dynamic total adjustment
- **Comprehensive Summaries**: Detailed final reports with hypothesis counts and branch exploration

### 🧠 Sequential Thinking Engine
- **Complete Implementation**: Fully functional sequential thinking process with visual formatting
- **Session Management**: Persistent thought sessions with UUID-based tracking
- **Thought Validation**: Comprehensive validation of thought sequences and logic
- **Real-time Processing**: Immediate thought processing with visual feedback

### 🔬 Advanced Hypothesis System
- **Hypothesis Generation**: Mark thoughts as hypotheses with visual indicators
- **Verification Engine**: Complete hypothesis verification system with status tracking
- **Status Tracking**: Track confirmation, refutation, partial validation, or pending status
- **Relationship Mapping**: Link verifications to specific hypotheses with visual connections

### 🏗️ Modern Architecture
- **Proper MCP SDK Integration**: Uses official `@modelcontextprotocol/sdk` v1.12.1 patterns
- **Type Safety**: Full TypeScript implementation with comprehensive interfaces
- **Modular Design**: Clean separation of concerns with dedicated managers
- **Session Persistence**: In-memory session storage with TTL support

### 🔧 Technical Excellence
- **Multi-Transport Ready**: Full stdio support (production-ready), SSE (deprecated), and Streamable HTTP transports
- **Comprehensive Logging**: Structured logging with Pino, auto-routed to stderr in stdio mode
- **Error Recovery**: Graceful error handling with structured JSON responses
- **Configuration Management**: Environment-based configuration avoiding circular dependencies

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

**🚀 ENHANCED IMPLEMENTATION** - Complete sequential thinking tool with **beautiful visual formatting** and all advertised features working at maximum effectiveness.

The tool facilitates detailed, step-by-step thinking processes for problem-solving and analysis with comprehensive hypothesis tracking capabilities. **All functionality has been implemented, tested, and enhanced with visual excellence.**

**Enhanced Implementation Features:**
- **🎨 Visual Formatting**: Beautiful colored boxes with emojis for different thought types
- **📊 Rich Metadata**: Structured JSON responses with complete session analytics
- **🔧 Dynamic Adjustment**: Automatic totalThoughts adjustment as thinking evolves
- **💾 Complete Session Management**: Full thought session tracking with UUID-based identification
- **🔬 Hypothesis Engine**: Working hypothesis generation, verification, and visual status tracking
- **✅ Validation System**: Comprehensive input validation and structured error handling
- **🌿 Branching Support**: Full support for thought branching and revision with visual indicators
- **📋 Enhanced Summaries**: Complete summary reports with hypothesis status and metadata

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

### 🎨 Visual Output
The server now provides beautiful visual formatting for all thoughts:

```
┌──────────────────────────────────────────┐
│ 💭 Thought 1/4                           │
├──────────────────────────────────────────┤
│ Let me analyze the problem systematically │
└──────────────────────────────────────────┘
```

### Basic Sequential Thinking
```javascript
// Regular thinking step with enhanced response
{
  thought: "Let me analyze the problem...",
  thoughtNumber: 1,
  nextThoughtNeeded: true,
  totalThoughts: 5
}
// Response includes metadata:
{
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1,
  "sessionComplete": false
}
```

### 🔬 Hypothesis Generation
```javascript
// Generate a hypothesis with visual formatting
{
  thought: "I believe the root cause is memory leakage",
  thoughtNumber: 2,
  thoughtType: "hypothesis",
  nextThoughtNeeded: true,
  totalThoughts: 5
}
```
**Visual Output:**
```
┌────────────────────────────────────────────────┐
│ 🔬 Hypothesis 2/5                              │
├────────────────────────────────────────────────┤
│ I believe the root cause is memory leakage     │
└────────────────────────────────────────────────┘
```

### ✅ Hypothesis Verification
```javascript
// Verify a hypothesis with enhanced tracking
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
**Visual Output:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Verification 3/3 (testing hypothesis 2)                  │
├─────────────────────────────────────────────────────────────┤
│ After analyzing the memory dump, the leak is confirmed     │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 Advanced Features
- **Revisions**: `🔄 Revision X/Y (revising thought Z)`
- **Branching**: `🌿 Branch X/Y (from thought Z, ID: branch-name)`
- **Dynamic Totals**: Automatically adjusts when thoughtNumber > totalThoughts
- **Rich Summaries**: Complete session analytics with hypothesis status

## Comparison with Original

| Feature | Original modelcontextprotocol/servers | Enhanced Version (v2.0.0) |
|---------|--------------------------------------|---------------------------|
| Implementation Status | ✅ Working baseline | 🚀 **ENHANCED & OPTIMIZED** |
| Visual Formatting | ✅ Chalk with borders | 🎨 **IMPROVED WITH EMOJIS** |
| Tool Registration | ✅ Proper API usage | ✅ **ENHANCED WITH METADATA** |
| Sequential Thinking Logic | ✅ Basic implementation | 🧠 **ADVANCED WITH ANALYTICS** |
| Session Management | ❌ Simple state tracking | 💾 **ENTERPRISE UUID-BASED SESSIONS** |
| Architecture | ✅ Class-based | 🏗️ **ENHANCED MODULAR DESIGN** |
| Validation | ✅ Basic validation | ✅ **COMPREHENSIVE WITH STRUCTURED ERRORS** |
| Error Handling | ✅ Basic error responses | 🛡️ **PRODUCTION-GRADE WITH JSON STRUCTURE** |
| Hypothesis Tracking | ❌ Not implemented | 🔬 **FULLY IMPLEMENTED WITH VISUAL INDICATORS** |
| Verification System | ❌ Not implemented | ✅ **COMPLETE WITH STATUS TRACKING** |
| Summary Reports | ❌ Missing | 📋 **DETAILED WITH ANALYTICS & METADATA** |
| Multi-Transport | ❌ Stdio only | 🌐 **COMPLETE ARCHITECTURE (STDIO/HTTP/SSE)** |
| Dynamic Adjustment | ✅ Total thoughts adjustment | 🔧 **ENHANCED WITH METADATA TRACKING** |
| Response Format | ✅ Basic JSON | 📊 **RICH METADATA WITH SESSION STATE** |
| Configuration | ❌ Hardcoded values | ⚙️ **ENVIRONMENT-BASED CONFIGURATION** |
| TypeScript Support | ✅ Basic types | 💎 **FULL WITH COMPREHENSIVE INTERFACES** |
| Production Ready | ✅ Working | 🚀 **ENTERPRISE-GRADE MAXIMUM EFFECTIVENESS** |

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

## Example Workflow - 🚀 ENHANCED IMPLEMENTATION

**All examples below showcase the enhanced visual formatting and rich metadata responses.**

### 🎯 Complete Problem-Solving Session

1. **Define the Problem**
   ```javascript
   { thought: "Need to analyze why the API is slow", thoughtNumber: 1, nextThoughtNeeded: true, totalThoughts: 4 }
   ```
   **Visual Output:**
   ```
   ┌──────────────────────────────────────────┐
   │ 💭 Thought 1/4                           │
   ├──────────────────────────────────────────┤
   │ Need to analyze why the API is slow      │
   └──────────────────────────────────────────┘
   ```

2. **Generate Hypothesis**
   ```javascript
   { thought: "Database queries might be unoptimized", thoughtNumber: 2, thoughtType: "hypothesis", nextThoughtNeeded: true, totalThoughts: 4 }
   ```
   **Visual Output:**
   ```
   ┌─────────────────────────────────────────────────┐
   │ 🔬 Hypothesis 2/4                               │
   ├─────────────────────────────────────────────────┤
   │ Database queries might be unoptimized           │
   └─────────────────────────────────────────────────┘
   ```

3. **Verify Hypothesis**
   ```javascript
   { thought: "Query analysis confirms N+1 problem", thoughtNumber: 3, thoughtType: "verification", relatedTo: [2], verificationResult: "confirmed", nextThoughtNeeded: true, totalThoughts: 4 }
   ```
   **Visual Output:**
   ```
   ┌──────────────────────────────────────────────────────┐
   │ ✅ Verification 3/4 (testing hypothesis 2)           │
   ├──────────────────────────────────────────────────────┤
   │ Query analysis confirms N+1 problem                 │
   └──────────────────────────────────────────────────────┘
   ```

4. **Final Solution**
   ```javascript
   { thought: "Solution: Implement eager loading to fix N+1 queries", thoughtNumber: 4, nextThoughtNeeded: false, totalThoughts: 4 }
   ```

5. **Enhanced Final Summary**
   ```
   Sequential thinking process complete with 4 thoughts.

   Hypotheses: 1
   - Confirmed: 1

   --- Session Metadata ---
   {
     "thoughtNumber": 4,
     "totalThoughts": 4,
     "nextThoughtNeeded": false,
     "branches": [],
     "thoughtHistoryLength": 4,
     "hypothesesSummary": {
       "total": 1,
       "confirmed": 1,
       "refuted": 0,
       "partial": 0,
       "pending": 0
     },
     "revisionsCount": 0,
     "sessionComplete": true
   }
   ```

### 🚀 Enhanced Features

- **🎨 Visual Excellence**: Beautiful colored formatting with emojis and borders
- **📊 Rich Metadata**: Every response includes complete session analytics
- **💾 Session Persistence**: Enterprise-grade session management with UUID tracking
- **🔬 Hypothesis Tracking**: Visual indicators and comprehensive status tracking
- **✅ Validation**: Comprehensive validation with structured error responses
- **🌿 Branching**: Full support for alternative reasoning paths with visual indicators
- **🔄 Revision**: Ability to revise previous thoughts with visual feedback
- **🔧 Dynamic Adjustment**: Automatic totalThoughts adjustment as thinking evolves

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

## Contributing

We welcome contributions! Please feel free to submit pull requests with improvements, bug fixes, or new features at [https://github.com/nalyk/sequentialthinking](https://github.com/nalyk/sequentialthinking).

## Acknowledgments

**Version 2.0.0 represents a revolutionary enhancement** of the Sequential Thinking server, building upon the original concept and drastically improving it with **visual excellence**, **rich metadata**, and **enterprise-grade features**.

**🚀 Revolutionary Enhancements:**
- 🎨 **Visual Excellence**: Added beautiful chalk formatting with emojis and bordered boxes
- 📊 **Rich Metadata**: Enhanced every response with structured JSON analytics
- 🔧 **Dynamic Intelligence**: Automatic totalThoughts adjustment and session tracking
- 💾 **Enterprise Architecture**: UUID-based sessions with comprehensive state management
- 🔬 **Advanced Hypothesis System**: Complete implementation with visual status tracking
- 🛡️ **Production-Grade**: Structured error handling and comprehensive validation
- 🌐 **Multi-Transport**: Complete stdio/HTTP/SSE architecture vs. basic stdio-only

**🎯 Maximum Effectiveness Achieved:**
Our implementation takes the best ideas from the original MCP server reference and enhances them with modern architecture, visual excellence, and enterprise-grade features, resulting in a sequential thinking tool that works at **maximum effectiveness**.

Based on concepts from [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) but **drastically enhanced** with professional-grade implementation, visual formatting, rich metadata responses, and comprehensive feature set.
