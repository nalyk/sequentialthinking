# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that implements a sequential thinking tool for dynamic and reflective problem-solving. The server provides a structured thinking process that allows for revision, branching, adaptive reasoning, hypothesis testing, and verification workflows. **Updated to MCP Specification 2025-06-18 with latest TypeScript SDK v1.15.0 and comprehensive reliability improvements.**

## Architecture

The project consists of a single main file (`index.ts`) that implements:

- **SequentialThinkingServer class**: Core server logic that manages thought history, branches, validation, and memory management
- **ThoughtData interface**: Defines the structure for thought data with support for revisions, branching, and verification workflows
- **MCP Server Integration**: Uses the @modelcontextprotocol/sdk to create a compliant MCP server
- **Enhanced Type Safety**: Comprehensive input validation and sanitization
- **Memory Management**: Configurable limits and automatic cleanup

The server provides one tool called `sequentialthinking` that facilitates step-by-step problem-solving with the ability to:
- Revise previous thoughts with validation
- Branch into alternative reasoning paths with limits
- Dynamically adjust the total number of thoughts needed
- Maintain context across multiple thinking steps
- **Classify thoughts as hypothesis or verification**
- **Track verification results (confirmed, refuted, partial, pending)**
- **Relate thoughts to previous thoughts for better context**
- **Enhanced visual formatting with colored output for different thought types**
- **Automatic memory management and cleanup**
- **Comprehensive input validation and sanitization**

## Build Commands

```bash
# Build the project (compiles TypeScript to JavaScript)
npm run build

# Build with file watching for development
npm run watch

# Prepare the project (runs build automatically)
npm run prepare
```

## Development Setup

The project uses:
- **TypeScript**: Configured for ES2022 target with NodeNext module resolution
- **Output**: Compiled JavaScript goes to `dist/` directory
- **Entry point**: `dist/index.js` (executable binary)
- **Dependencies**: Uses MCP SDK v1.15.0, chalk for colored output
- **Note**: yargs dependency is included but not currently used (reserved for future CLI features)

## Key Implementation Details

### ThoughtData Structure
- **Required fields**: `thought`, `thoughtNumber`, `totalThoughts`, `nextThoughtNeeded`
- **Optional fields**: `isRevision`, `revisesThought`, `branchFromThought`, `branchId`, `needsMoreThoughts`
- **Enhanced optional fields**:
  - `thoughtType`: 'hypothesis' or 'verification' to classify the thought
  - `verificationResult`: 'confirmed', 'refuted', 'partial', or 'pending' for verification thoughts
  - `relatedTo`: Array of thought numbers this thought relates to or builds upon (max 50 items)

### Input Validation & Type Safety
- **Comprehensive validation**: All inputs are validated with descriptive error messages
- **Type guards**: Proper type checking functions instead of unsafe casting
- **Input sanitization**: Removes harmful control characters that could interfere with terminal output
- **Length limits**: Thoughts (1-10000 chars), branch IDs (1-100 chars), related thoughts (max 50)
- **Logical consistency**: Validates relationships (e.g., revisions require target thought, verification results only with verification type)

### Memory Management
- **Configurable limits** via environment variables:
  - `MAX_THOUGHT_HISTORY`: Maximum thoughts in history (default: 1000)
  - `MAX_BRANCHES`: Maximum number of branches (default: 50)
  - `MAX_THOUGHTS_PER_BRANCH`: Maximum thoughts per branch (default: 100)
- **Automatic cleanup**: Removes oldest thoughts/branches when limits exceeded
- **Intelligent branch management**: Keeps most recently active branches
- **Memory status reporting**: Included in tool responses

### Thought Logging
- **Enhanced colored terminal output using chalk:**
  - 💭 Blue for normal thoughts
  - 🔄 Yellow for revisions  
  - 🌿 Green for branches
  - 🔬 Cyan for hypothesis thoughts
  - ✅ Magenta for verification thoughts
- Can be disabled with `DISABLE_THOUGHT_LOGGING=true` environment variable
- Logs to stderr to avoid interfering with MCP communication
- **Shows related thoughts and verification results in context**
- **Enhanced formatting with borders and structured display**

### Branch Management
- Supports creating alternative reasoning paths
- Maintains separate history for each branch with cleanup
- Branches are identified by string IDs (1-100 characters)
- **Automatic limit enforcement**: Prevents exceeding configured branch limits
- **Branch navigation utilities**: Helper methods for branch management
- **Cleanup based on recency**: Keeps most recently used branches

### Verification Workflow
- **Hypothesis tracking**: Identifies thoughts marked as hypotheses
- **Verification status**: Tracks confirmed, refuted, partial, and pending verifications
- **Unverified hypothesis detection**: Automatically identifies hypotheses needing verification
- **Related thought mapping**: Links verifications to their corresponding hypotheses
- **Workflow reporting**: Includes verification status in tool responses

### Error Handling
- **Consistent error responses**: All errors include descriptive messages and timestamps
- **Graceful degradation**: Validation failures don't crash the server
- **Structured error output**: JSON-formatted error responses for MCP clients

## Testing the Server

The server runs on stdio and communicates using the MCP protocol. It can be tested by:
1. Building the project: `npm run build`
2. Running the executable: `./dist/index.js`
3. Sending MCP-formatted requests for tool listing and tool calls

**Example test startup:**
```bash
timeout 3s ./dist/index.js 2>&1 || echo "Server startup test completed"
```

## Recent Fixes & Improvements (July 2025)

This server has been **comprehensively fixed and enhanced** with the following improvements:

### Critical Fixes Applied
1. **Tool schema alignment**: Fixed mismatch between inputSchema and ThoughtData interface
2. **Type safety improvements**: Replaced unsafe type casting with proper type guards
3. **Consistent error handling**: Standardized error responses with timestamps
4. **Memory leak prevention**: Added configurable limits and automatic cleanup
5. **Input sanitization**: Prevents terminal injection and validates all inputs
6. **ESM compatibility**: Verified proper ES module configuration
7. **Branch management**: Enhanced with cleanup and navigation utilities
8. **Verification workflow**: Integrated verification results with thinking process logic

### Updated Dependencies
- **@modelcontextprotocol/sdk**: 1.15.0 (latest stable)
- **TypeScript**: 5.8.3 (latest stable) 
- **@types/yargs**: 17.0.33 (latest)
- **chalk**: 5.3.0 (for colored output)

### MCP Specification Compliance
- **Complies with MCP Specification 2025-06-18** (latest version)
- **stdio transport only**: Focused on reliable stdio communication
- Compatible with latest MCP clients (Claude, Cursor, etc.)
- Enhanced structured output support
- Proper error handling and response formatting

### New Features Added
- Hypothesis/verification thought classification with validation
- Verification result tracking with workflow integration
- Thought relationship mapping with limits
- Enhanced visual formatting with colored output
- Structured JSON output with comprehensive information
- Memory management with configurable limits
- Input sanitization and validation
- Branch management with automatic cleanup

## Environment Variables

- `DISABLE_THOUGHT_LOGGING`: Set to `"true"` to disable thought logging output
- `MAX_THOUGHT_HISTORY`: Maximum number of thoughts to keep in history (default: 1000)
- `MAX_BRANCHES`: Maximum number of branches to maintain (default: 50)
- `MAX_THOUGHTS_PER_BRANCH`: Maximum thoughts per branch (default: 100)

## Tool Response Format

The `sequentialthinking` tool now returns enhanced responses including:

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "thoughtType": "hypothesis",
  "verificationResult": null,
  "isRevision": false,
  "branches": ["branch-1", "branch-2"],
  "thoughtHistoryLength": 15,
  "relatedTo": [3, 7],
  "branchId": null,
  "memoryStatus": {
    "thoughtHistoryLimit": 1000,
    "branchLimit": 50,
    "thoughtsPerBranchLimit": 100
  },
  "verificationWorkflow": {
    "verificationStatus": {
      "confirmed": 2,
      "refuted": 1,
      "partial": 1,
      "pending": 0
    },
    "unverifiedHypothesesCount": 2,
    "unverifiedHypotheses": [
      {
        "thoughtNumber": 5,
        "thought": "Initial hypothesis about the problem structure..."
      }
    ]
  }
}
```

## Important Implementation Notes

- **Stdio only**: This server is designed for stdio transport communication
- **Memory managed**: Automatic cleanup prevents resource exhaustion
- **Type safe**: Comprehensive validation ensures data integrity
- **Error resilient**: Graceful error handling with descriptive messages
- **MCP compliant**: Follows latest MCP specification requirements
- **Production ready**: Enhanced reliability and safety features

## Important Instruction Reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.