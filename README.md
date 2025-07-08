<div align="center">
  <img src="assets/logo.png" alt="Sequential Thinking Logo" width="200" height="200">
  <h1>Sequential Thinking MCP Server</h1>
  
Based on concepts from [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers).
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

### Basic Workflow

1. **Normal thinking**: Use the tool as usual for sequential thinking
2. **Save sequence**: Add `saveSequence: { title: "My Analysis" }` to save your progress
3. **Resume later**: Use `loadSequence: { id: "returned-sequence-id" }` to continue
4. **Automatic persistence**: All subsequent thoughts are automatically saved

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

### Example: Loading a Sequence

```javascript
{
  "thought": "I want to continue my previous analysis.",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "loadSequence": {
    "id": "seq-abc123def456"
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

#### npx

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
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

For quick installation, click one of the installation buttons below...

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-sequential-thinking%22%5D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-sequential-thinking%22%5D%7D&quality=insiders)

[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22--rm%22%2C%22-i%22%2C%22mcp%2Fsequentialthinking%22%5D%7D) [![Install with Docker in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Docker-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22--rm%22%2C%22-i%22%2C%22mcp%2Fsequentialthinking%22%5D%7D&quality=insiders)

For manual installation, add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing `Preferences: Open Settings (JSON)`.

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

> Note that the `mcp` key is not needed in the `.vscode/mcp.json` file.

For NPX installation:

```json
{
  "mcp": {
    "servers": {
      "sequential-thinking": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
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

## Building

Local development:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch for changes during development
npm run watch
```

Docker:

```bash
docker build -t mcp/sequentialthinking -f Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
