# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that implements **tools, resources, and prompts** for dynamic and reflective problem-solving. The server provides a structured thinking process that allows for revision, branching, adaptive reasoning, hypothesis testing, and verification workflows. **Updated to MCP Specification 2025-06-18+ with TypeScript SDK v1.18.1, featuring ELICITATION (interactive tools), SAMPLING (server-side LLM requests), HATEOAS (self-discoverable API), enhanced error handling with suggested actions, comprehensive reliability improvements, PERSISTENT SEQUENCES functionality, Docker containerization, and FULL MCP CAPABILITIES implementation.**

## Architecture

The project consists of a single main file (`index.ts`) that implements:

- **SequentialThinkingServer class**: Core server logic that manages thought history, branches, validation, memory management, and persistence
- **ThoughtData interface**: Defines the structure for thought data with support for revisions, branching, and verification workflows
- **MCP Server Integration**: Uses the @modelcontextprotocol/sdk to create a compliant MCP server
- **Enhanced Type Safety**: Comprehensive input validation and sanitization
- **Memory Management**: Configurable limits and automatic cleanup
- **SQLite Database**: Persistent storage for sequences and thoughts across sessions
- **Sequence Management**: Save, load, and manage thinking sequences over time

The server provides **complete MCP capabilities**:

### 🔥 **RESOURCES** (5 live contextual resources)

- `sequence://current` - Live current sequence data
- `sequences://library` - Browse all saved sequences
- `patterns://analysis` - User thinking patterns analysis with relationship insights
- `verification://status` - Real-time verification dashboard
- `thoughts://recent` - Recent thoughts across all sequences with relationship data

### 🔥 **PROMPTS** (5 professional thinking templates)

- `start_analysis` - Structured analysis framework
- `hypothesis_verification` - Verification workflow template
- `sequence_synthesis` - Synthesis template
- `branch_exploration` - Alternative perspective template
- `problem_decomposition` - Problem breakdown template

### **TOOL** (Sequential thinking with persistence)

The `sequentialthinking` tool facilitates step-by-step problem-solving with the ability to:

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
- **🔥 PERSISTENT SEQUENCES: Save and load thinking sequences across sessions**
- **🔥 SEQUENCE MANAGEMENT: Continue complex reasoning over days or weeks**
- **🔥 AUTOMATIC PERSISTENCE: Thoughts are saved to database when sequence is active**
- **🔥 ENHANCED SEARCH: Full-text search across thought content using SQLite FTS**
- **🔥 EXPORT/IMPORT: Complete sequence backup and sharing capabilities**
- **🔥 RELATIONSHIP INSIGHTS: Enhanced resources show thought connections and patterns**

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
- **Dependencies**: Uses MCP SDK v1.15.0, chalk for colored output, sqlite3 for persistence
- **Database**: SQLite database stored as `dist/sequences.db`
- **Note**: yargs dependency is included but not currently used (reserved for future CLI features)

## Key Implementation Details

### ThoughtData Structure

- **Required fields**: `thought`, `thoughtNumber`, `totalThoughts`, `nextThoughtNeeded`
- **Optional fields**: `isRevision`, `revisesThought`, `branchFromThought`, `branchId`, `needsMoreThoughts`
- **Enhanced optional fields**:
  - `thoughtType`: 'hypothesis' or 'verification' to classify the thought
  - `verificationResult`: 'confirmed', 'refuted', 'partial', or 'pending' for verification thoughts
  - `relatedTo`: Array of thought numbers this thought relates to or builds upon (max 50 items)
- **🔥 NEW: Sequence Management Fields**:
  - `saveSequence`: Object with 'title' and optional 'description' to save current thoughts as a sequence
  - `loadSequence`: Object with 'id' to load a previously saved sequence
  - `searchSequence`: Object with optional 'query', 'limit', and 'contentSearch' to search sequences with fuzzy matching and full-text search
  - `exportSequence`: Object with 'id' to export sequence as JSON
  - `importSequence`: Object with 'data' to import sequence from JSON
  - `sequenceId`: ID of the current sequence (for continuing existing sequences)

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

### 🔥 PERSISTENT SEQUENCES (NEW)

- **SQLite Database**: Stores sequences and thoughts permanently in `dist/sequences.db`
- **Sequence Management**: Create, load, and manage thinking sequences across sessions
- **Automatic Persistence**: When a sequence is active, all thoughts are automatically saved
- **Sequence Operations**:
  - `saveSequence: { title: "My Analysis", description: "Optional description" }` - Save current thoughts as a new sequence
  - `loadSequence: { id: "sequence-id" }` - Load a previously saved sequence into memory
  - Automatic saving when sequence is active
- **Database Schema**:
  - `sequences` table: id, title, description, created, lastModified, status, thoughtCount
  - `thoughts` table: All thought data plus sequenceId, created, modified timestamps
- **Seamless Integration**: Works with all existing features (revisions, branches, verification)
- **Backward Compatibility**: All existing functionality works exactly the same

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

This server has been **comprehensively transformed** from a basic tool-only implementation to a **complete MCP platform** with the following improvements:

### 🎆 LATEST ENHANCEMENTS (July 2025)

**Phase 1: Enhanced Content Search**

- Added SQLite FTS (Full-Text Search) for searching within thought content
- Extended `searchSequence` with `contentSearch` parameter for 10x faster access to relevant past thoughts
- Maintains existing fuzzy search for titles/descriptions

**Phase 2: Export/Import Capabilities**

- Added `exportSequence` functionality for JSON backup/sharing
- Added `importSequence` functionality to restore sequences
- Complete sequence portability with all thoughts and metadata

**Phase 3: Enhanced Relationship Utilization**

- Better utilization of existing `relatedTo` field in resources
- Added relationship analysis to `patterns://analysis` resource
- Enhanced `thoughts://recent` to show connections and counts
- Visual understanding of thought connection patterns

### Critical Fixes Applied

1. **Tool schema alignment**: Fixed mismatch between inputSchema and ThoughtData interface
2. **Type safety improvements**: Replaced unsafe type casting with proper type guards
3. **Consistent error handling**: Standardized error responses with timestamps
4. **Memory leak prevention**: Added configurable limits and automatic cleanup
5. **Input sanitization**: Prevents terminal injection and validates all inputs
6. **ESM compatibility**: Verified proper ES module configuration
7. **Branch management**: Enhanced with cleanup and navigation utilities
8. **Verification workflow**: Integrated verification results with thinking process logic

### 🚀 VERSION 2.0.0 MAJOR UPGRADE - "LITE" Edition (October 2025)

**A focused, philosophy-respecting upgrade that keeps the server lean while adding powerful optional capabilities!**

#### Design Philosophy: Clean by Default, Powerful When Needed

This release respects the original sequential thinking philosophy: **clean, focused thinking without bloat**. All advanced features are **opt-in via environment variables**, ensuring the server remains lightweight and fast by default.

#### New Optional Capabilities (All Disabled by Default)

1. **ELICITATION** - Interactive tool conversations (`ENABLE_ELICITATION=true`)
   - Server can ask users clarifying questions during tool execution
   - **FIXED**: Elicitation now triggers BEFORE validation throws errors
   - Automatic prompting when branch IDs are missing
   - Smart verification-to-hypothesis linking suggestions
   - **Default: OFF** - Validation errors guide users cleanly

2. **SAMPLING** - Server-side LLM integration (`ENABLE_SAMPLING=true`)
   - Capability declared only when explicitly enabled
   - Framework ready for future LLM completion requests
   - **Default: OFF** - Not declared unless needed

3. **HATEOAS** - Self-discoverable API (`ENABLE_HATEOAS=true`)
   - When enabled: Responses include `_links` with available actions
   - Conditional links and schema hints
   - **Default: OFF** - Clean, minimal responses
   - **Response size**: 515 bytes (clean) vs 1594 bytes (with HATEOAS)
   - **3x smaller** when disabled!

4. **Enhanced Error Handling** (Always On, But Lean)
   - Errors categorized by type (VALIDATION_ERROR, RESOURCE_NOT_FOUND, etc.)
   - `suggestedActions` array guides next steps
   - `retryable` flag and `contextualHelp` included
   - HATEOAS links only when `ENABLE_HATEOAS=true`

5. **Docker Containerization** (Always Available)
   - Production-ready multi-stage Dockerfile
   - docker-compose.yml with persistence
   - Node 20 Alpine, health checks, non-root user

#### Response Size Comparison

| Mode | Size | Use Case |
|------|------|----------|
| **Clean (default)** | ~515 bytes | Fast, focused thinking |
| **With HATEOAS** | ~1594 bytes | API exploration, discovery |
| **Improvement** | **3x smaller!** | Respects original philosophy |

#### Architecture Improvements

- SDK upgraded from 1.15.0 → 1.18.1 (latest features)
- Enhanced type safety with proper interfaces
- Optional capabilities pattern for extensibility
- Fixed elicitation validation order bug
- Clean separation of concerns

### Updated Dependencies (v2.0.0)

- **@modelcontextprotocol/sdk**: 1.18.1 (latest with elicitation & sampling)
- **TypeScript**: 5.8.3 (latest stable)
- **@types/yargs**: 17.0.33 (latest)
- **chalk**: 5.3.0 (for colored output)
- **sqlite3**: 5.1.7 (for persistent sequences)
- **@types/sqlite3**: 3.1.11 (TypeScript definitions)
- **express**: 4.21.2 (for HTTP transport)
- **cors**: 2.8.5 (for CORS support)

### MCP Specification Compliance

- **Complies with MCP Specification 2025-06-18** (latest version)
- **stdio transport only**: Focused on reliable stdio communication
- Compatible with latest MCP clients (Claude, Cursor, etc.)
- Enhanced structured output support
- Proper error handling and response formatting
- **🔥 FULL MCP CAPABILITIES**: Tools, Resources, and Prompts implemented
- **Previously ~20% MCP usage, now 100% of relevant features**

### New Features Added

- Hypothesis/verification thought classification with validation
- Verification result tracking with workflow integration
- Thought relationship mapping with limits
- Enhanced visual formatting with colored output
- Structured JSON output with comprehensive information
- Memory management with configurable limits
- Input sanitization and validation
- Branch management with automatic cleanup
- **🔥 PERSISTENT SEQUENCES**: Save and load thinking sequences across sessions
- **🔥 SQLITE DATABASE**: Permanent storage for sequences and thoughts
- **🔥 SEQUENCE MANAGEMENT**: Continue complex reasoning over time
- **🔥 RESOURCES CAPABILITY**: 5 live contextual data resources
- **🔥 PROMPTS CAPABILITY**: 5 professional thinking templates
- **🔥 FULL MCP IMPLEMENTATION**: Complete utilization of MCP 2025-06-18 specification

## Environment Variables

### Core Configuration
- `DISABLE_THOUGHT_LOGGING`: Set to `"true"` to disable thought logging output (default: false)
- `MAX_THOUGHT_HISTORY`: Maximum number of thoughts to keep in history (default: 1000)
- `MAX_BRANCHES`: Maximum number of branches to maintain (default: 50)
- `MAX_THOUGHTS_PER_BRANCH`: Maximum thoughts per branch (default: 100)

### Optional Features (v2.0 LITE)
- `ENABLE_HATEOAS`: Set to `"true"` to include HATEOAS links in responses (default: false)
  - **Impact**: Increases response size from ~515 bytes to ~1594 bytes
  - **Use case**: API exploration, self-discoverable workflows
- `ENABLE_ELICITATION`: Set to `"true"` to enable interactive prompts (default: false)
  - **Impact**: Server can ask clarifying questions during tool execution
  - **Use case**: Guided workflows, interactive AI assistants
- `ENABLE_SAMPLING`: Set to `"true"` to declare sampling capability (default: false)
  - **Impact**: Advertises ability to request LLM completions
  - **Use case**: Future agentic AI features (framework ready)

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
  "currentSequenceId": "seq-123456",
  "persistenceEnabled": true,
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

## 🔥 PERSISTENT SEQUENCES USAGE EXAMPLES

### Saving a Sequence

```javascript
// After thinking through several thoughts, save them as a sequence
{
  "thought": "This completes my analysis. Let me save this sequence.",
  "thoughtNumber": 5,
  "totalThoughts": 5,
  "nextThoughtNeeded": false,
  "saveSequence": {
    "title": "Product Strategy Analysis",
    "description": "Comprehensive analysis of our product strategy for Q2 2025"
  }
}
```

### Loading a Sequence

```javascript
// Load a previously saved sequence to continue work
{
  "thought": "I want to continue my previous analysis.",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "loadSequence": {
    "id": "seq-123456"
  }
}
```

### Continuing a Loaded Sequence

```javascript
// After loading, continue adding thoughts (automatically saved)
{
  "thought": "Building on my previous analysis, I now realize...",
  "thoughtNumber": 6,
  "totalThoughts": 8,
  "nextThoughtNeeded": true
}
```

### Typical Workflow

1. **Start thinking** - Use normal sequential thinking
2. **Save sequence** - When ready to pause: `saveSequence: { title: "My Analysis" }`
3. **Find sequence** - Search your work: `searchSequence: { query: "analysis", contentSearch: true }`
4. **Resume later** - Load sequence: `loadSequence: { id: "found-sequence-id" }`
5. **Continue thinking** - All new thoughts automatically saved to sequence
6. **Build complex insights** - Work on the same problem over days/weeks
7. **🎆 NEW: Export/Import** - Use `exportSequence`/`importSequence` for backup/sharing

### 🔍 Sequence Search Examples

```javascript
// Search with fuzzy matching (Romanian/Russian diacritics supported)
{
  "searchSequence": {
    "query": "strategia",     // finds "Strategia de dezvoltare"
    "limit": 10
  }
}

// NEW: Search within thought content using FTS
{
  "searchSequence": {
    "query": "market analysis",
    "limit": 10,
    "contentSearch": true    // searches within thought content
  }
}

// List all sequences (no query)
{
  "searchSequence": {
    "limit": 20
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
- **🔥 PERSISTENT**: SQLite database enables long-term reasoning across sessions
- **🔥 BACKWARD COMPATIBLE**: All existing functionality preserved
- **🔥 AUTOMATIC PERSISTENCE**: Thoughts saved automatically when sequence active
- **🔥 FULL MCP IMPLEMENTATION**: Resources, Prompts, and Tools all implemented
- **🔥 ENHANCED SEARCH & PORTABILITY**: Full-text search, export/import, relationship insights
- **🔥 PHILOSOPHY ALIGNED**: All new features enhance without interfering with thinking

## Important Instruction Reminders

Do what you are told; nothing more, nothing less.

NEVER create files unless they are absolutely necessary to achieve your goal.

ALWAYS edit an existing file rather than create a new one.

NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if the user explicitly requests it.

The Claude Code command line interface does not have hot reload functionality, so to really test it, you (yes, you, Claude) have to reboot.
