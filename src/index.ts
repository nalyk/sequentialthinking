#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

/** 
 * Thought entry interface with optional hypothesis tracking
 */
interface ThoughtEntry {
  number: number;
  content: string;
  thoughtType?: 'hypothesis' | 'verification';
  relatedTo?: number[];
  verificationResult?: 'confirmed' | 'refuted' | 'partial' | 'pending';
  isRevision?: boolean;
  revisesThought?: number;
}

/**
 * Input interface for validation
 */
interface ThoughtDataInput {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  thoughtType?: 'hypothesis' | 'verification';
  relatedTo?: number[];
  verificationResult?: 'confirmed' | 'refuted' | 'partial' | 'pending';
}

/**
 * Sequential Thinking Server implementation
 */
class SequentialThinkingServer {
  private thoughtHistory: ThoughtEntry[] = [];
  private branches: Record<string, ThoughtEntry[]> = {};
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: "sequential-thinking",
      version: packageJson.version,
      capabilities: {
        tools: {},
      },
    });

    this.setupTool();
  }

  /**
   * Validates thought data input
   */
  private validateThoughtData(data: ThoughtDataInput): void {
    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a non-empty string');
    }

    if (typeof data.nextThoughtNeeded !== 'boolean') {
      throw new Error('Invalid nextThoughtNeeded: must be a boolean');
    }

    if (!Number.isInteger(data.thoughtNumber) || data.thoughtNumber < 1) {
      throw new Error('Invalid thoughtNumber: must be an integer >= 1');
    }

    if (!Number.isInteger(data.totalThoughts) || data.totalThoughts < 1) {
      throw new Error('Invalid totalThoughts: must be an integer >= 1');
    }

    if (data.isRevision !== undefined && typeof data.isRevision !== 'boolean') {
      throw new Error('Invalid isRevision: must be a boolean');
    }

    if (data.revisesThought !== undefined && (!Number.isInteger(data.revisesThought) || data.revisesThought < 1)) {
      throw new Error('Invalid revisesThought: must be an integer >= 1');
    }

    if (data.branchFromThought !== undefined && (!Number.isInteger(data.branchFromThought) || data.branchFromThought < 1)) {
      throw new Error('Invalid branchFromThought: must be an integer >= 1');
    }

    if (data.thoughtType !== undefined && !['hypothesis', 'verification'].includes(data.thoughtType)) {
      throw new Error('Invalid thoughtType: must be "hypothesis" or "verification"');
    }

    if (data.relatedTo !== undefined && (!Array.isArray(data.relatedTo) || !data.relatedTo.every(n => Number.isInteger(n) && n >= 1))) {
      throw new Error('Invalid relatedTo: must be an array of integers >= 1');
    }

    if (data.verificationResult !== undefined && !['confirmed', 'refuted', 'partial', 'pending'].includes(data.verificationResult)) {
      throw new Error('Invalid verificationResult: must be one of "confirmed", "refuted", "partial", "pending"');
    }
  }

  /**
   * Sets up the sequential thinking tool
   */
  private setupTool(): void {
    this.server.tool(
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
- Generates and tracks solution hypotheses
- Verifies hypotheses and tracks their status
- Repeats the process until satisfied
- Provides a summary of conclusions and hypothesis status

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
- thought_type: (optional) 'hypothesis' or 'verification' to mark special thoughts
- related_to: (optional) Array of thought numbers this hypothesis verification relates to
- verification_result: (optional) 'confirmed', 'refuted', 'partial', or 'pending' for verification outcome

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate (use thought_type='hypothesis')
8. Verify hypotheses by referencing them (use thought_type='verification' with related_to)
9. Repeat the process until satisfied with the solution
10. Process completes with a summary showing all hypotheses and their verification status
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached`,
      {
        thought: z.string().describe("Your current thinking step"),
        nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed after this"),
        thoughtNumber: z.number().int().min(1).describe("The index of this thought in the sequence"),
        totalThoughts: z.number().int().min(1).describe("The estimated total number of thoughts planned"),
        isRevision: z.boolean().optional().describe("True if revising a previous thought"),
        revisesThought: z.number().int().min(1).optional().describe("If revising, the thought number being revised"),
        branchFromThought: z.number().int().min(1).optional().describe("If branching, the thought number this branch starts from"),
        branchId: z.string().optional().describe("Identifier for the thought branch (if any)"),
        needsMoreThoughts: z.boolean().optional().describe("If true, the process likely needs more thoughts than initially estimated"),
        thoughtType: z.enum(['hypothesis', 'verification']).optional().describe("The type of thought: hypothesis or verification"),
        relatedTo: z.array(z.number().int().min(1)).optional().describe("Array of thought numbers this relates to"),
        verificationResult: z.enum(['confirmed', 'refuted', 'partial', 'pending']).optional().describe("Result of verification (only used with thoughtType='verification')"),
      },
      async (params) => {
        try {
          // Validate input data
          this.validateThoughtData(params);

          // Extract parameters
          const {
            thought,
            nextThoughtNeeded,
            thoughtNumber,
            totalThoughts,
            isRevision,
            revisesThought,
            branchFromThought,
            branchId,
            needsMoreThoughts,
            thoughtType,
            relatedTo,
            verificationResult,
          } = params;

          // Determine session (main history or branch)
          const sessionId = branchId && branchId.trim() !== "" ? branchId : "main";
          
          // Initialize branch if needed
          if (branchFromThought !== undefined && branchId) {
            if (!this.branches[branchId]) {
              const mainHistory = sessionId === "main" ? this.thoughtHistory : (this.branches["main"] || []);
              this.branches[branchId] = mainHistory
                .filter(entry => entry.number <= branchFromThought)
                .map(entry => ({ ...entry }));
            }
          }

          // Get the appropriate history
          const history = sessionId === "main" ? this.thoughtHistory : (this.branches[sessionId] = this.branches[sessionId] || []);

          // Create thought entry
          const thoughtEntry: ThoughtEntry = {
            number: thoughtNumber,
            content: thought,
            isRevision: isRevision,
            revisesThought: revisesThought,
            ...(thoughtType && { thoughtType }),
            ...(relatedTo && { relatedTo }),
            ...(verificationResult && { verificationResult }),
          };

          // Handle revision or append new thought
          if (isRevision && revisesThought !== undefined) {
            const existing = history.find(entry => entry.number === revisesThought);
            if (existing) {
              Object.assign(existing, thoughtEntry);
              thoughtEntry.number = revisesThought; // For logging
            } else {
              history.push({ ...thoughtEntry, number: revisesThought });
              thoughtEntry.number = revisesThought; // For logging
            }
          } else {
            history.push(thoughtEntry);
          }

          // Enhanced logging
          console.error(
            `[SequentialThinking] Session "${sessionId}" – Thought #${thoughtEntry.number}: "${thought}"` +
            (thoughtType ? ` [${thoughtType}]` : '') +
            (relatedTo ? ` (relates to: ${relatedTo.join(',')})` : '') +
            (verificationResult ? ` (${verificationResult})` : '') +
            (isRevision ? " (revision)" : branchFromThought !== undefined ? " (branch)" : "") +
            `, nextThoughtNeeded=${nextThoughtNeeded}, totalThoughts=${totalThoughts}` +
            (needsMoreThoughts ? ", needsMoreThoughts=true" : "")
          );

          // Generate summary if process is complete
          if (!nextThoughtNeeded) {
            const hypotheses = history.filter(t => t.thoughtType === 'hypothesis');
            const verifications = history.filter(t => t.thoughtType === 'verification');
            
            let summaryText = `Sequential thinking process complete with ${thoughtNumber} thoughts.`;
            
            if (hypotheses.length > 0) {
              summaryText += `\n\nHypotheses: ${hypotheses.length}`;
              hypotheses.forEach(h => {
                const related = verifications.filter(v => v.relatedTo?.includes(h.number));
                const status = related.length > 0 ? related[related.length - 1].verificationResult || 'pending' : 'pending';
                summaryText += `\n- #${h.number}: ${status}`;
              });
            }
            
            return {
              content: [{ type: "text", text: summaryText }],
            };
          }

          // Standard acknowledgment
          return {
            content: [{ type: "text", text: `Thought ${thoughtNumber} recorded.${needsMoreThoughts ? " (Adjusting plan for more thoughts.)" : ""}` }],
          };

        } catch (error) {
          console.error("Error in sequential_thinking tool:", error);
          return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Starts the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("✅ Sequential Thinking MCP Server is running (STDIO transport)");
  }
}

// Start the server
async function runServer() {
  try {
    const server = new SequentialThinkingServer();
    await server.start();
  } catch (err) {
    console.error("Fatal error starting SequentialThinking server:", err);
    process.exit(1);
  }
}

runServer().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
