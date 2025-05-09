#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/** 
 * In-memory storage for thought sessions. Each session (keyed by branchId or "main") 
 * holds an array of thought entries for that chain of reasoning.
 */
interface ThoughtEntry {
  number: number;
  content: string;
}
const sessions: Record<string, ThoughtEntry[]> = {};

/** Initialize MCP server with name, version, and declared capabilities (tools only) */
const server = new McpServer({
  name: "sequential-thinking",
  version: "1.0.0",
  capabilities: {
    tools: {},   // this server provides tools (no prompts/resources in this context)
  },
});

/** Register the sequential_thinking tool with its input schema and handler */
server.tool(
  "sequential_thinking",
  `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached`,
  {
    thought: z.string().describe("The current thought content in the sequence"),
    nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed after this"),
    thoughtNumber: z.number().int().describe("The index of this thought in the sequence"),
    totalThoughts: z.number().int().describe("The estimated total number of thoughts planned"),
    isRevision: z.boolean().optional().describe("True if revising a previous thought"),
    revisesThought: z.number().int().optional().describe("If revising, the thought number being revised"),
    branchFromThought: z.number().int().optional().describe("If branching, the thought number this branch starts from"),
    branchId: z.string().optional().describe("Identifier for the thought branch (if any)"),
    needsMoreThoughts: z.boolean().optional().describe("If true, the process likely needs more thoughts than initially estimated"),
  },
  async ({
    thought,
    nextThoughtNeeded,
    thoughtNumber,
    totalThoughts,
    isRevision,
    revisesThought,
    branchFromThought,
    branchId,
    needsMoreThoughts,
  }) => {
    // Determine session ID (use provided branchId or default to "main" sequence)
    const sessionId = branchId && branchId.trim() !== "" ? branchId : "main";

    // If branching is requested and a new branch session, initialize it by copying up to branchFromThought from main session
    if (branchFromThought !== undefined && branchId) {
      if (!sessions[branchId]) {
        const mainSession = sessions["main"] || [];
        sessions[branchId] = mainSession.filter(entry => entry.number <= branchFromThought).map(entry => ({ ...entry }));
      }
    }

    // Get or initialize the session for this sequence
    const session = sessions[sessionId] || (sessions[sessionId] = []);

    // Handle revision of a previous thought, if applicable
    if (isRevision && revisesThought !== undefined) {
      const existing = session.find(entry => entry.number === revisesThought);
      if (existing) {
        existing.content = thought;
      } else {
        session.push({ number: revisesThought, content: thought });
      }
    } else {
      // Append the new thought as the next in the sequence
      session.push({ number: thoughtNumber, content: thought });
    }

    // Log the thought for debugging/traceability
    console.error(`[SequentialThinking] Session "${sessionId}" – Thought #${thoughtNumber}: "${thought}"` +
                  (isRevision ? " (revision)" : branchFromThought !== undefined ? " (branch)" : "") + 
                  `, nextThoughtNeeded=${nextThoughtNeeded}, totalThoughts=${totalThoughts}` + 
                  (needsMoreThoughts ? ", needsMoreThoughts=true" : ""));

    // If this is the final thought (nextThoughtNeeded == false), optionally we could compile a summary or output.
    // For now, just acknowledge the completion of the thinking process.
    if (!nextThoughtNeeded) {
      return {
        content: [{ type: "text", text: `Sequential thinking process complete with ${thoughtNumber} thoughts.` }],
      };
    }

    // Otherwise, acknowledge the recording of this thought and prompt the next one if needed
    return {
      content: [{ type: "text", text: `Thought ${thoughtNumber} recorded.${needsMoreThoughts ? " (Adjusting plan for more thoughts.)" : ""}` }],
    };
  }
);

/** Start the server using stdio transport (for integration with tools like Claude Desktop) */
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Sequential Thinking MCP Server is running (STDIO transport)");
}
runServer().catch(err => {
  console.error("Fatal error starting SequentialThinking server:", err);
  process.exit(1);
});
