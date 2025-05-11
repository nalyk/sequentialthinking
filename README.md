# Sequential Thinking MCP Server

An MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process with advanced hypothesis tracking capabilities.

## 🆕 Version 1.1.0 - Enhanced Edition

This version includes significant enhancements over the original implementation, combining the best features of the original modelcontextprotocol/servers architecture with powerful new hypothesis generation and verification capabilities.

## Key Enhancements

### 1. 🔬 Hypothesis Generation & Verification
- **Hypothesis Tracking**: Mark thoughts as hypotheses and track their verification status
- **Related Thoughts**: Link verifications to specific hypotheses
- **Verification Results**: Track confirmation, refutation, partial validation, or pending status
- **Comprehensive Summary**: Get a complete report of all hypotheses and their final states

### 2. 🏗️ Improved Architecture
- **Class-Based Design**: Robust object-oriented architecture from the original
- **Enhanced Validation**: Comprehensive input validation with detailed error messages
- **Better Error Handling**: Graceful error recovery with informative messages
- **Type Safety**: Full TypeScript support with proper interfaces

### 3. 🔧 Technical Improvements
- **Dynamic Versioning**: Automatically syncs with package.json version
- **Structured Logging**: Enhanced debugging information with hypothesis status
- **Efficient Storage**: Optimized data structures for better performance
- **Backward Compatibility**: Maintains full compatibility with existing integrations

## Features

### Core Features
- Break down complex problems into manageable steps
- Revise and refine thoughts as understanding deepens
- Branch into alternative paths of reasoning
- Adjust the total number of thoughts dynamically
- Express uncertainty and explore multiple approaches

### New Features (v1.1.0)
- Generate solution hypotheses with explicit marking
- Verify hypotheses and track verification status
- Link verifications to multiple hypotheses
- Get comprehensive summary reports
- Enhanced error handling and validation

## Tool

### sequential_thinking

Facilitates a detailed, step-by-step thinking process for problem-solving and analysis with hypothesis tracking capabilities.

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

| Feature | Original modelcontextprotocol/servers | Enhanced Version (v1.1.0) |
|---------|--------------------------------------|---------------------------|
| Architecture | Class-based | ✅ Class-based (improved) |
| Validation | Basic | ✅ Comprehensive with detailed errors |
| Error Handling | Standard | ✅ Enhanced with recovery |
| Hypothesis Tracking | ❌ None | ✅ Full support |
| Verification Status | ❌ None | ✅ Complete tracking |
| Summary Reports | ❌ Basic | ✅ Detailed with hypothesis status |
| Dynamic Versioning | ❌ Hardcoded | ✅ From package.json |
| TypeScript Support | ✅ Basic | ✅ Full with interfaces |

## Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### npx (Recommended)

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    }
  }
}
```

#### docker

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
docker build -t mcp/sequentialthinking -f Dockerfile .
```

## Example Workflow

1. **Define the Problem**
   ```javascript
   { thought: "Need to analyze why the API is slow", thoughtNumber: 1, nextThoughtNeeded: true }
   ```

2. **Generate Hypotheses**
   ```javascript
   { thought: "Database queries might be unoptimized", thoughtNumber: 2, thoughtType: "hypothesis", nextThoughtNeeded: true }
   { thought: "Network latency could be the issue", thoughtNumber: 3, thoughtType: "hypothesis", nextThoughtNeeded: true }
   ```

3. **Verify Hypotheses**
   ```javascript
   { thought: "Query analysis shows N+1 problem", thoughtNumber: 4, thoughtType: "verification", relatedTo: [2], verificationResult: "confirmed", nextThoughtNeeded: true }
   { thought: "Network tests show normal latency", thoughtNumber: 5, thoughtType: "verification", relatedTo: [3], verificationResult: "refuted", nextThoughtNeeded: false }
   ```

4. **Get Summary**
   ```
   Sequential thinking process complete with 5 thoughts.
   
   Hypotheses: 2
   - #2: confirmed
   - #3: refuted
   ```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

## Contributing

We welcome contributions! Please feel free to submit pull requests with improvements, bug fixes, or new features.

## Acknowledgments

Based on the original Sequential Thinking server from [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) with significant enhancements for hypothesis tracking and improved architecture.
