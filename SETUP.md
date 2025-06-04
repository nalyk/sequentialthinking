# Sequential Thinking MCP Server - Setup Guide

## Quick Start

### 1. Build the Server
```bash
npm install
npm run build
```

### 2. Test the Server
```bash
# Test basic functionality
npm test

# Test server startup
npm start
```

### 3. Configure Claude Desktop

Add this to your `claude_desktop_config.json`:

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

**Replace `/path/to/sequentialthinking` with the actual path to this directory.**

### 4. Verify Installation

Start Claude Desktop and ask:
> "Use the sequential thinking tool to analyze why a web API might be slow"

You should see structured, numbered thoughts with hypothesis tracking.

## Example Usage

### Basic Sequential Thinking
The server now provides beautiful visual output with colored, bordered boxes:

```
┌──────────────────────────────────────────┐
│ 💭 Thought 1/3                           │
├──────────────────────────────────────────┤
│ Let me analyze the problem systematically │
└──────────────────────────────────────────┘
```

### With Hypothesis Tracking
```
┌────────────────────────────────────────────────┐
│ 🔬 Hypothesis 2/4                              │
├────────────────────────────────────────────────┤
│ Database queries might be creating bottleneck  │
└────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ✅ Verification 3/4 (testing hypothesis 2)               │
├──────────────────────────────────────────────────────────┤
│ Query analysis confirms N+1 problem - hypothesis correct │
└──────────────────────────────────────────────────────────┘
```

### Advanced Features
- **Visual Formatting**: Colorful bordered boxes with emojis for different thought types
- **Revisions**: `🔄 Revision` - Mark thoughts as revisions of previous ones  
- **Branching**: `🌿 Branch` - Create alternative reasoning paths with branch IDs
- **Hypothesis Verification**: `🔬 Hypothesis` + `✅ Verification` - Track confirmation/refutation
- **Dynamic Adjustment**: Total thoughts automatically adjust as thinking evolves
- **Rich Metadata**: JSON metadata in every response with session state
- **Comprehensive Summaries**: Detailed final reports with hypothesis status, branches, revisions

### Response Format Enhancement
Each response now includes structured metadata:
```json
{
  "thoughtNumber": 3,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": ["alternative-path", "backup-plan"],
  "thoughtHistoryLength": 3,
  "sessionComplete": false
}
```

## Configuration Options

Set environment variables to customize behavior:

```bash
# Logging
export LOG_LEVEL=info                    # trace, debug, info, warn, error, fatal
export LOG_PRETTY_PRINT=true            # Pretty print logs
export LOG_DISABLE_IN_STDIO=false       # Disable logs in stdio mode

# Sessions
export SESSION_TTL=3600                  # Session TTL in seconds
export SESSION_CHECK_PERIOD=60          # Cleanup check period

# Transports (advanced)
export TRANSPORT_STDIO_ENABLED=true     # Enable stdio (recommended)
export TRANSPORT_HTTP_ENABLED=false     # Enable HTTP transport
export TRANSPORT_SSE_ENABLED=false      # Enable SSE transport (deprecated)
```

## Troubleshooting

### Build Fails
- Ensure you have Node.js 18+ installed
- Run `npm install` to install dependencies
- Check TypeScript compilation with `npx tsc`

### Claude Desktop Not Connecting
- Verify the path in `claude_desktop_config.json` is correct
- Check that `build/index.js` exists and is executable
- Look at Claude Desktop logs for connection errors

### Tool Not Available
- Restart Claude Desktop after configuration changes
- Verify the server starts without errors: `npm start`
- Check the server responds: `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm start`

## Development

### Running in Development Mode
```bash
npm run dev  # Watch mode compilation
```

### Running Tests
```bash
npm test
```

### Manual Testing
```bash
# Test tool listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npm start

# Test sequential thinking
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "sequential_thinking", "arguments": {"thought": "Test thought", "thoughtNumber": 1, "nextThoughtNeeded": false, "totalThoughts": 1}}}' | npm start
```