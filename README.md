<div align="center">
  <img src="assets/logo.png" alt="Sequential Thinking Logo" width="200" height="200">
  <h1>Sequential Thinking MCP Server</h1>
  
Based on concepts from [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers).

**Repository:** [https://github.com/nalyk/sequentialthinking](https://github.com/nalyk/sequentialthinking)
</div>

An MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process with enhanced memory management, type safety, verification workflows, and **persistent sequences** for long-term reasoning across sessions.

## Features

- **Structured Problem Solving**: Break down complex problems into manageable steps
- **Dynamic Revision**: Revise and refine thoughts as understanding deepens
- **Alternative Reasoning**: Branch into alternative paths of reasoning
- **Adaptive Planning**: Adjust the total number of thoughts dynamically
- **Hypothesis Testing**: Generate and verify solution hypotheses with result tracking
- **🔥 PERSISTENT SEQUENCES**: Save and load thinking sequences across sessions
- **🔥 LONG-TERM REASONING**: Continue complex analysis over days or weeks
- **🔥 AUTOMATIC PERSISTENCE**: Thoughts saved automatically when sequence is active
- **Memory Management**: Configurable limits prevent memory leaks
- **Type Safety**: Comprehensive input validation and sanitization
- **Enhanced Logging**: Colored terminal output with thought classification

## Tool

### sequential_thinking

Facilitates a detailed, step-by-step thinking process for problem-solving and analysis with enhanced validation and tracking.

**Required Inputs:**

- `thought` (string): The current thinking step (1-10000 characters)
- `nextThoughtNeeded` (boolean): Whether another thought step is needed
- `thoughtNumber` (integer): Current thought number (positive integer)
- `totalThoughts` (integer): Estimated total thoughts needed (positive integer)

**Optional Inputs:**

- `isRevision` (boolean): Whether this revises previous thinking
- `revisesThought` (integer): Which thought is being reconsidered (required if isRevision=true)
- `branchFromThought` (integer): Branching point thought number
- `branchId` (string): Branch identifier (1-100 characters, required if branchFromThought specified)
- `needsMoreThoughts` (boolean): If more thoughts are needed
- `thoughtType` (enum): "hypothesis" or "verification" to classify the thought
- `verificationResult` (enum): "confirmed", "refuted", "partial", or "pending" (only with thoughtType="verification")
- `relatedTo` (array): Array of thought numbers this relates to (max 50 items)
- **🔥 NEW: `saveSequence`** (object): Save current thoughts as a sequence `{ title: "My Analysis", description: "Optional" }`
- **🔥 NEW: `loadSequence`** (object): Load a previously saved sequence `{ id: "sequence-id" }`
- **🔥 NEW: `searchSequence`** (object): Search for sequences with fuzzy matching `{ query: "strategy", limit: 10 }`
- **🔥 NEW: `sequenceId`** (string): ID of the current sequence for automatic persistence

**Enhanced Response:**
The tool now returns comprehensive information including:

- Thought processing status
- Branch information and management
- Memory usage status
- Verification workflow tracking
- Unverified hypotheses detection
- Related thought mapping
- **🔥 NEW: Current sequence information and persistence status**
- **🔥 NEW: Sequence management actions (save/load confirmations)**

## Usage

The Sequential Thinking tool is designed for:

- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Tasks that need to maintain context over multiple steps
- Hypothesis generation and verification workflows
- Situations where irrelevant information needs to be filtered out
- **🔥 NEW: Long-term reasoning projects (business strategy, research planning)**
- **🔥 NEW: Complex decision-making that evolves over time**
- **🔥 NEW: Building on previous insights and conclusions**

## 🔥 PERSISTENT SEQUENCES USAGE

### 🔍 **FINDING YOUR SEQUENCES** (Most Important!)

**Never remember sequence IDs again!** Use powerful fuzzy search with Romanian/Russian support:

```javascript
// Search for sequences (fuzzy matching)
{
  "thought": "I need to find my analysis",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "searchSequence": {
    "query": "strategy",
    "limit": 10
  }
}

// List all sequences (no query = show all)
{
  "thought": "Show me all my sequences",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "searchSequence": {
    "limit": 20
  }
}
```

**🌍 Multilingual Support Examples:**
```javascript
// Romanian diacritics work perfectly
{
  "searchSequence": {
    "query": "strategie",  // finds "Strategia de dezvoltare"
    "limit": 10
  }
}

// Russian/Cyrillic also supported
{
  "searchSequence": {
    "query": "стратегия",  // finds "Стратегический анализ"
    "limit": 10
  }
}
```

### Basic Workflow

1. **Normal thinking**: Use the tool as usual for sequential thinking
2. **Save sequence**: Add `saveSequence: { title: "My Analysis" }` to save your progress
3. **🔍 Find sequence**: Use `searchSequence` to find your work (fuzzy search!)
4. **Resume**: Use `loadSequence: { id: "found-sequence-id" }` to continue
5. **Automatic persistence**: All subsequent thoughts are automatically saved

### Example: Saving a Sequence

```javascript
{
  "thought": "I've completed my initial analysis. Let me save this sequence.",
  "thoughtNumber": 5,
  "totalThoughts": 5,
  "nextThoughtNeeded": false,
  "saveSequence": {
    "title": "Product Strategy Analysis Q2 2025",
    "description": "Comprehensive analysis of our product strategy options"
  }
}
```

### Example: Searching for Sequences

```javascript
// Search by partial title/description
{
  "thought": "I need to find my product analysis work",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "searchSequence": {
    "query": "product",
    "limit": 10
  }
}

// Response shows matching sequences with titles, descriptions, and IDs
```

### Example: Loading a Sequence

```javascript
// After finding the sequence ID through search
{
  "thought": "I want to continue my previous analysis.",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "loadSequence": {
    "id": "seq-abc123def456"  // From search results
  }
}
```

### Example: Continuing a Loaded Sequence

```javascript
{
  "thought": "Building on my previous analysis, I now see that we need to consider...",
  "thoughtNumber": 6,
  "totalThoughts": 8,
  "nextThoughtNeeded": true
}
// This thought will be automatically saved to the active sequence
```

## Configuration

### Environment Variables

- `DISABLE_THOUGHT_LOGGING`: Set to "true" to disable colored thought logging to stderr
- `MAX_THOUGHT_HISTORY`: Maximum number of thoughts to keep in history (default: 1000)
- `MAX_BRANCHES`: Maximum number of branches to maintain (default: 50)
- `MAX_THOUGHTS_PER_BRANCH`: Maximum thoughts per branch (default: 100)

### Database Storage

The server automatically creates and manages a SQLite database at `dist/sequences.db` to store:

- **Sequences**: Metadata including title, description, creation date, and status
- **Thoughts**: Complete thought data with timestamps and sequence relationships
- **Automatic cleanup**: Old sequences and thoughts are managed according to configured limits
- **Cross-session persistence**: All data survives server restarts

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### Local Build

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "node",
      "args": ["/path/to/sequentialthinking/dist/index.js"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false",
        "MAX_THOUGHT_HISTORY": "1000",
        "MAX_BRANCHES": "50",
        "MAX_THOUGHTS_PER_BRANCH": "100"
      }
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
      "args": ["run", "--rm", "-i", "mcp/sequentialthinking"],
      "env": {
        "DISABLE_THOUGHT_LOGGING": "false",
        "MAX_THOUGHT_HISTORY": "1000"
      }
    }
  }
}
```

### Usage with VS Code

Add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing `Preferences: Open Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

> Note that the `mcp` key is not needed in the `.vscode/mcp.json` file.

For local build installation:

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "node",
        "args": ["/path/to/sequentialthinking/dist/index.js"],
        "env": {
          "DISABLE_THOUGHT_LOGGING": "false",
          "MAX_THOUGHT_HISTORY": "1000"
        }
      }
    }
  }
}
```

For Docker installation:

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "docker",
        "args": ["run", "--rm", "-i", "mcp/sequentialthinking"],
        "env": {
          "DISABLE_THOUGHT_LOGGING": "false"
        }
      }
    }
  }
}
```

## Enhanced Features

### 🔥 PERSISTENT SEQUENCES (NEW)

- **SQLite Database**: All sequences and thoughts stored permanently
- **Cross-session continuity**: Resume complex reasoning after days or weeks
- **Automatic persistence**: Thoughts saved automatically when sequence is active
- **Seamless integration**: Works with all existing features (revisions, branches, verification)
- **Backward compatibility**: All existing functionality preserved

### Memory Management

- Automatic cleanup of old thoughts and branches
- Configurable limits to prevent resource exhaustion
- Intelligent branch management with recency-based cleanup

### Type Safety & Validation

- Comprehensive input validation with descriptive error messages
- Input sanitization to prevent terminal injection attacks
- Logical consistency validation (e.g., revisions require target thought number)

### Verification Workflow

- Track hypothesis generation and verification status
- Identify unverified hypotheses automatically
- Comprehensive verification result tracking
- Related thought mapping for better context

### Enhanced Logging

- Color-coded thought types:
  - 💭 Blue for normal thoughts
  - 🔄 Yellow for revisions
  - 🌿 Green for branches
  - 🔬 Cyan for hypothesis thoughts
  - ✅ Magenta for verification thoughts
- Related thought information display
- Verification result context

## Installation and Building

To use this MCP server, you need to build it locally:

```bash
# Clone the repository
git clone https://github.com/nalyk/sequentialthinking.git
cd sequentialthinking

# Install dependencies
npm install

# Build the project
npm run build

# Watch for changes during development
npm run watch
```

After building, the executable will be available at `dist/index.js`.

Docker:

```bash
docker build -t mcp/sequentialthinking -f Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
