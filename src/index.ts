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
      `## WHAT
Dynamic problem-solving tool that adapts as you think.

## WHEN TO USE
✓ SOLVE: Complex multi-step problems
✓ PLAN: Projects with unknown scope  
✓ ANALYZE: Issues requiring course correction
✓ DESIGN: Solutions that need revision

## SUPERPOWERS
🔀 FLEX: Adjust, revise, branch anytime
🧬 EVOLVE: Non-linear thinking paths
🔬 VERIFY: Track and test hypotheses

## ESSENTIAL PARAMETERS
• thought → Your current step
• next_thought_needed → Continue? (true/false)
• thought_number → Current position
• total_thoughts → Estimated total (flexible)

## CONTROL PARAMETERS
• is_revision → Revising previous? (true/false)
• revises_thought → Which thought# to revise
• branch_from_thought → Branch start point
• branch_id → Branch identifier
• needs_more_thoughts → Need to extend?

## HYPOTHESIS TRACKING
• thought_type → 'hypothesis' or 'verification'
• related_to → Which thought#s this relates to
• verification_result → 'confirmed'/'refuted'/'partial'/'pending'

## THE WORKFLOW
START → EXPLORE → VERIFY → CONCLUDE

## THE RULES
1. ESTIMATE FIRST: Start with a thought count (adjust later)
2. REVISE FREELY: Question anything, anytime
3. EXTEND ALWAYS: Add thoughts beyond estimates
4. MARK CLEARLY: Label revisions and branches
5. IGNORE NOISE: Skip irrelevant information
6. HYPOTHESIS EARLY: Identify solutions quickly
7. VERIFY THOROUGHLY: Link verifications to hypotheses
8. ITERATE UNTIL: Continue until satisfied
9. SUMMARIZE COMPLETELY: Show all hypothesis states
10. END DELIBERATELY: Only stop when truly done

## REMEMBER
This tool adapts to YOUR thinking. Stay flexible, think clearly, verify thoroughly.`,
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
