<div align="center">
  <img src="assets/logo.png" alt="Sequential Thinking Logo" width="200" height="200">
  <h1>Sequential Thinking MCP Server</h1>
  
Based on concepts from [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers).
</div>

An MCP server implementation that provides **tools, resources, and prompts** for dynamic and reflective problem-solving through a structured thinking process with enhanced memory management, type safety, verification workflows, and **persistent sequences** for long-term reasoning across sessions.

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

## MCP Capabilities

### 🔥 Resources (NEW)

The server now exposes **5 live contextual resources** that provide real-time access to your thinking data:

#### sequence://current
- **Live current sequence data** including active sequence info, thought count, verification status
- **Real-time updates** as you think and work
- **Persistence status** showing if thoughts are being automatically saved

#### sequences://library
- **Browse all saved sequences** with metadata and recent activity
- **Complete sequence overview** for managing your thinking projects
- **Search preparation** to find sequences before loading

#### patterns://analysis
- **Thinking patterns analysis** across all your sequences
- **Performance metrics** like average thoughts per sequence, verification rates
- **Relationship patterns** showing thought connections and most connected thoughts
- **Memory usage insights** and cognitive load assessment

#### verification://status
- **Real-time verification dashboard** showing hypothesis testing progress
- **Unverified hypotheses tracking** to identify work needing completion
- **Verification success rates** and workflow metrics

#### thoughts://recent
- **Recent thoughts overview** across all sequences
- **Activity metrics** including revisions, branches, hypothesis/verification counts
- **Relationship insights** showing thought connections and connection counts
- **Cross-sequence insights** and thinking velocity

### 🔥 Prompts (NEW)

The server provides **5 professional thinking templates** for structured problem-solving:

#### start_analysis
- **Structured analysis framework** for beginning systematic investigation
- **Problem definition, context, and hypothesis generation** sections
- **Evidence gathering plan** and analysis structure
- **Customizable** with problem description, context, and goals

#### hypothesis_verification
- **Systematic verification template** for testing hypotheses
- **Evidence collection and testing criteria** frameworks
- **Confirmation, refutation, and partial verification** pathways
- **Customizable** with hypothesis, evidence sources, and test methods

#### sequence_synthesis
- **Insights synthesis template** for completed thinking sequences
- **Key findings extraction** and thought evolution analysis
- **Decision points and action items** identification
- **Customizable** with sequence title and focus areas

#### branch_exploration
- **Alternative perspective template** for exploring different approaches
- **Stakeholder analysis** and constraint evaluation
- **Devil's advocate analysis** and option comparison
- **Customizable** with original approach, stakeholders, and constraints

#### problem_decomposition
- **Complex problem breakdown** template for manageable components
- **Dependency analysis** and priority assessment
- **Resource requirements** and risk evaluation
- **Customizable** with main problem, complexity level, and domain

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
- **🔥 NEW: `searchSequence`** (object): Search for sequences with fuzzy matching `{ query: "strategy", limit: 10, contentSearch: true }`
- **🔥 NEW: `exportSequence`** (object): Export sequence as JSON `{ id: "sequence-id" }`
- **🔥 NEW: `importSequence`** (object): Import sequence from JSON `{ data: {...} }`
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

The Sequential Thinking MCP server provides:

### 🔥 **Resources** for contextual data access:
- View live sequence data, browse sequence library, analyze thinking patterns
- Access verification status and recent thoughts across all sequences
- **Non-intrusive**: Access when you want it, doesn't interrupt thinking

### 🔥 **Prompts** for structured thinking:
- Professional templates for analysis, verification, synthesis, exploration, decomposition
- **User-chosen**: Select templates when helpful, not forced
- **Customizable**: Fill in variables for personalized frameworks

### **Tool** for sequential thinking:
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
// Search for sequences (fuzzy matching titles/descriptions)
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

// NEW: Search within thought content using FTS
{
  "thought": "Find sequences containing specific thoughts",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "searchSequence": {
    "query": "market analysis",
    "limit": 10,
    "contentSearch": true
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
3. **🔍 Find sequence**: Use `searchSequence` to find your work (fuzzy search + content search!)
4. **Resume**: Use `loadSequence: { id: "found-sequence-id" }` to continue
5. **Automatic persistence**: All subsequent thoughts are automatically saved
6. **🎆 NEW: Export/Import**: Use `exportSequence`/`importSequence` for backup/sharing

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

### Example: Exporting a Sequence

```javascript
// Export sequence as JSON for backup or sharing
{
  "thought": "I want to export my analysis for backup",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "exportSequence": {
    "id": "seq-abc123def456"
  }
}

// Response contains complete sequence data in JSON format
```

### Example: Importing a Sequence

```javascript
// Import sequence from JSON backup
{
  "thought": "I want to import my backed up analysis",
  "thoughtNumber": 1,
  "totalThoughts": 1,
  "nextThoughtNeeded": false,
  "importSequence": {
    "data": {
      "sequence": { /* sequence metadata */ },
      "thoughts": [ /* array of thoughts */ ]
    }
  }
}

// Response shows new sequence ID and import confirmation
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

### 🔥 ENHANCED SEARCH & PORTABILITY (NEW)

- **Full-text search**: Search within thought content using SQLite FTS
- **Content search**: Find sequences containing specific thoughts or ideas
- **Export/Import**: Complete sequence backup and sharing capabilities
- **JSON portability**: Export sequences as JSON for backup or migration
- **Relationship insights**: Enhanced resources show thought connections

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

## MCP Specification Compliance

This server implements **MCP 2025-06-18 specification** with:
- ✅ **Tools**: Sequential thinking with persistence
- ✅ **Resources**: Live contextual data access (5 resources)
- ✅ **Prompts**: Professional thinking templates (5 prompts)
- ✅ **Full MCP compliance**: All features follow latest specification

**Previously only ~20% of MCP capabilities were used. Now utilizing 100% of relevant features.**

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
