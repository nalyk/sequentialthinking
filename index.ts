#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from 'chalk';

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
  thoughtType?: 'hypothesis' | 'verification';
  verificationResult?: 'confirmed' | 'refuted' | 'partial' | 'pending';
  relatedTo?: number[];
}

class SequentialThinkingServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private disableThoughtLogging: boolean;
  private readonly maxThoughtHistory: number;
  private readonly maxBranches: number;
  private readonly maxThoughtsPerBranch: number;

  constructor() {
    this.disableThoughtLogging = (process.env.DISABLE_THOUGHT_LOGGING || "").toLowerCase() === "true";
    this.maxThoughtHistory = parseInt(process.env.MAX_THOUGHT_HISTORY || "1000", 10);
    this.maxBranches = parseInt(process.env.MAX_BRANCHES || "50", 10);
    this.maxThoughtsPerBranch = parseInt(process.env.MAX_THOUGHTS_PER_BRANCH || "100", 10);
  }

  private isValidThoughtType(value: unknown): value is 'hypothesis' | 'verification' {
    return typeof value === 'string' && (value === 'hypothesis' || value === 'verification');
  }

  private isValidVerificationResult(value: unknown): value is 'confirmed' | 'refuted' | 'partial' | 'pending' {
    return typeof value === 'string' && ['confirmed', 'refuted', 'partial', 'pending'].includes(value);
  }

  private isValidNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every(item => typeof item === 'number' && item > 0);
  }

  private sanitizeThoughtContent(content: string): string {
    // Remove potentially harmful characters that could interfere with terminal output
    return content.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  }

  private validateThoughtData(input: unknown): ThoughtData {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: must be an object');
    }

    const data = input as Record<string, unknown>;

    // Validate required fields
    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a non-empty string');
    }
    if (data.thought.length === 0 || data.thought.length > 10000) {
      throw new Error('Invalid thought: must be between 1 and 10000 characters');
    }

    if (typeof data.thoughtNumber !== 'number' || data.thoughtNumber < 1 || !Number.isInteger(data.thoughtNumber)) {
      throw new Error('Invalid thoughtNumber: must be a positive integer');
    }

    if (typeof data.totalThoughts !== 'number' || data.totalThoughts < 1 || !Number.isInteger(data.totalThoughts)) {
      throw new Error('Invalid totalThoughts: must be a positive integer');
    }

    if (typeof data.nextThoughtNeeded !== 'boolean') {
      throw new Error('Invalid nextThoughtNeeded: must be a boolean');
    }

    // Validate optional fields
    if (data.isRevision !== undefined && typeof data.isRevision !== 'boolean') {
      throw new Error('Invalid isRevision: must be a boolean');
    }

    if (data.revisesThought !== undefined && (typeof data.revisesThought !== 'number' || data.revisesThought < 1 || !Number.isInteger(data.revisesThought))) {
      throw new Error('Invalid revisesThought: must be a positive integer');
    }

    if (data.branchFromThought !== undefined && (typeof data.branchFromThought !== 'number' || data.branchFromThought < 1 || !Number.isInteger(data.branchFromThought))) {
      throw new Error('Invalid branchFromThought: must be a positive integer');
    }

    if (data.branchId !== undefined && (typeof data.branchId !== 'string' || data.branchId.length === 0 || data.branchId.length > 100)) {
      throw new Error('Invalid branchId: must be a non-empty string with max 100 characters');
    }

    if (data.needsMoreThoughts !== undefined && typeof data.needsMoreThoughts !== 'boolean') {
      throw new Error('Invalid needsMoreThoughts: must be a boolean');
    }

    if (data.thoughtType !== undefined && !this.isValidThoughtType(data.thoughtType)) {
      throw new Error('Invalid thoughtType: must be "hypothesis" or "verification"');
    }

    if (data.verificationResult !== undefined && !this.isValidVerificationResult(data.verificationResult)) {
      throw new Error('Invalid verificationResult: must be "confirmed", "refuted", "partial", or "pending"');
    }

    if (data.relatedTo !== undefined && !this.isValidNumberArray(data.relatedTo)) {
      throw new Error('Invalid relatedTo: must be an array of positive integers');
    }

    if (data.relatedTo !== undefined && data.relatedTo.length > 50) {
      throw new Error('Invalid relatedTo: maximum 50 related thoughts allowed');
    }

    // Validate logical consistency
    if (data.isRevision && !data.revisesThought) {
      throw new Error('revisesThought is required when isRevision is true');
    }

    if (data.branchFromThought && !data.branchId) {
      throw new Error('branchId is required when branchFromThought is specified');
    }

    if (data.verificationResult && data.thoughtType !== 'verification') {
      throw new Error('verificationResult can only be used with thoughtType="verification"');
    }

    return {
      thought: this.sanitizeThoughtContent(data.thought),
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision,
      revisesThought: data.revisesThought,
      branchFromThought: data.branchFromThought,
      branchId: data.branchId,
      needsMoreThoughts: data.needsMoreThoughts,
      thoughtType: data.thoughtType,
      verificationResult: data.verificationResult,
      relatedTo: data.relatedTo,
    };
  }

  private cleanupOldThoughts(): void {
    // Keep only the most recent thoughts up to the limit
    if (this.thoughtHistory.length > this.maxThoughtHistory) {
      this.thoughtHistory = this.thoughtHistory.slice(-this.maxThoughtHistory);
    }
  }

  private cleanupOldBranches(): void {
    const branchIds = Object.keys(this.branches);
    
    // Remove excess branches if we have too many
    if (branchIds.length > this.maxBranches) {
      // Sort by creation time (last thought in each branch) and keep most recent
      const sortedBranches = branchIds.sort((a, b) => {
        const aLastThought = this.branches[a][this.branches[a].length - 1];
        const bLastThought = this.branches[b][this.branches[b].length - 1];
        return bLastThought.thoughtNumber - aLastThought.thoughtNumber;
      });

      // Remove oldest branches
      const toRemove = sortedBranches.slice(this.maxBranches);
      toRemove.forEach(branchId => {
        delete this.branches[branchId];
      });
    }

    // Cleanup thoughts within each branch
    Object.keys(this.branches).forEach(branchId => {
      if (this.branches[branchId].length > this.maxThoughtsPerBranch) {
        this.branches[branchId] = this.branches[branchId].slice(-this.maxThoughtsPerBranch);
      }
    });
  }

  private validateBranchLimits(branchId: string): void {
    if (Object.keys(this.branches).length >= this.maxBranches && !this.branches[branchId]) {
      throw new Error(`Maximum number of branches (${this.maxBranches}) exceeded`);
    }
  }

  private getBranchThoughts(branchId: string): ThoughtData[] {
    return this.branches[branchId] || [];
  }

  private getVerificationStatus(): { confirmed: number; refuted: number; partial: number; pending: number } {
    const status = { confirmed: 0, refuted: 0, partial: 0, pending: 0 };
    
    this.thoughtHistory.forEach(thought => {
      if (thought.thoughtType === 'verification' && thought.verificationResult) {
        status[thought.verificationResult]++;
      }
    });

    return status;
  }

  private getHypothesesNeedingVerification(): ThoughtData[] {
    const hypotheses = this.thoughtHistory.filter(thought => thought.thoughtType === 'hypothesis');
    const verifications = this.thoughtHistory.filter(thought => thought.thoughtType === 'verification');
    
    return hypotheses.filter(hypothesis => {
      // Check if this hypothesis has been verified
      return !verifications.some(verification => 
        verification.relatedTo && verification.relatedTo.includes(hypothesis.thoughtNumber)
      );
    });
  }

  private findRelatedThoughts(thoughtNumber: number): ThoughtData[] {
    return this.thoughtHistory.filter(thought => 
      thought.relatedTo && thought.relatedTo.includes(thoughtNumber)
    );
  }

  private formatThought(thoughtData: ThoughtData): string {
    const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId, thoughtType, verificationResult, relatedTo } = thoughtData;

    let prefix = '';
    let context = '';

    if (isRevision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else if (thoughtType === 'hypothesis') {
      prefix = chalk.cyan('🔬 Hypothesis');
      context = '';
    } else if (thoughtType === 'verification') {
      prefix = chalk.magenta('✅ Verification');
      context = verificationResult ? ` (${verificationResult})` : '';
    } else {
      prefix = chalk.blue('💭 Thought');
      context = '';
    }

    // Add related thoughts info
    if (relatedTo && relatedTo.length > 0) {
      context += ` [relates to: ${relatedTo.join(', ')}]`;
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
  }

  public processThought(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
    try {
      const validatedInput = this.validateThoughtData(input);

      // Auto-adjust total thoughts if needed
      if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
        validatedInput.totalThoughts = validatedInput.thoughtNumber;
      }

      // Validate branch limits before processing
      if (validatedInput.branchFromThought && validatedInput.branchId) {
        this.validateBranchLimits(validatedInput.branchId);
      }

      // Add to main history
      this.thoughtHistory.push(validatedInput);

      // Add to branch if applicable
      if (validatedInput.branchFromThought && validatedInput.branchId) {
        if (!this.branches[validatedInput.branchId]) {
          this.branches[validatedInput.branchId] = [];
        }
        this.branches[validatedInput.branchId].push(validatedInput);
      }

      // Perform memory cleanup
      this.cleanupOldThoughts();
      this.cleanupOldBranches();

      // Log thought if enabled
      if (!this.disableThoughtLogging) {
        const formattedThought = this.formatThought(validatedInput);
        console.error(formattedThought);
      }

      // Enhanced response with verification tracking
      const verificationStatus = this.getVerificationStatus();
      const unverifiedHypotheses = this.getHypothesesNeedingVerification();
      
      const response = {
        thoughtNumber: validatedInput.thoughtNumber,
        totalThoughts: validatedInput.totalThoughts,
        nextThoughtNeeded: validatedInput.nextThoughtNeeded,
        thoughtType: validatedInput.thoughtType,
        verificationResult: validatedInput.verificationResult,
        isRevision: validatedInput.isRevision,
        branches: Object.keys(this.branches),
        thoughtHistoryLength: this.thoughtHistory.length,
        relatedTo: validatedInput.relatedTo,
        branchId: validatedInput.branchId,
        memoryStatus: {
          thoughtHistoryLimit: this.maxThoughtHistory,
          branchLimit: this.maxBranches,
          thoughtsPerBranchLimit: this.maxThoughtsPerBranch
        },
        verificationWorkflow: {
          verificationStatus,
          unverifiedHypothesesCount: unverifiedHypotheses.length,
          unverifiedHypotheses: unverifiedHypotheses.map(h => ({
            thoughtNumber: h.thoughtNumber,
            thought: h.thought.substring(0, 100) + (h.thought.length > 100 ? '...' : '')
          }))
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      const errorResponse = {
        error: error instanceof Error ? error.message : String(error),
        status: 'failed',
        timestamp: new Date().toISOString()
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(errorResponse, null, 2)
        }],
        isError: true
      };
    }
  }
}

const SEQUENTIAL_THINKING_TOOL: Tool = {
  name: "sequentialthinking",
  description: `A detailed tool for dynamic and reflective problem-solving through thoughts.
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
- nextThoughtNeeded: True if you need more thinking, even if at what seemed like the end
- thoughtNumber: Current number in sequence (can go beyond initial total if needed)
- totalThoughts: Current estimate of thoughts needed (can be adjusted up/down)
- isRevision: A boolean indicating if this thought revises previous thinking
- revisesThought: If isRevision is true, which thought number is being reconsidered
- branchFromThought: If branching, which thought number is the branching point
- branchId: Identifier for the current branch (if any)
- needsMoreThoughts: If reaching end but realizing more thoughts needed
- thoughtType: 'hypothesis' or 'verification' to indicate the type of thought
- verificationResult: If thoughtType is 'verification', result can be 'confirmed', 'refuted', 'partial', or 'pending'
- relatedTo: Array of thought numbers this thought relates to or builds upon

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
11. Only set nextThoughtNeeded to false when truly done and a satisfactory answer is reached

Environment variables:
- DISABLE_THOUGHT_LOGGING: Set to "true" to disable colored thought logging to stderr
- MAX_THOUGHT_HISTORY: Maximum number of thoughts to keep in history (default: 1000)
- MAX_BRANCHES: Maximum number of branches to maintain (default: 50)
- MAX_THOUGHTS_PER_BRANCH: Maximum thoughts per branch (default: 100)`,
  inputSchema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description: "Your current thinking step",
        minLength: 1,
        maxLength: 10000
      },
      nextThoughtNeeded: {
        type: "boolean",
        description: "Whether another thought step is needed after this"
      },
      thoughtNumber: {
        type: "integer",
        description: "The index of this thought in the sequence",
        minimum: 1
      },
      totalThoughts: {
        type: "integer",
        description: "The estimated total number of thoughts planned",
        minimum: 1
      },
      isRevision: {
        type: "boolean",
        description: "True if revising a previous thought"
      },
      revisesThought: {
        type: "integer",
        description: "If revising, the thought number being revised",
        minimum: 1
      },
      branchFromThought: {
        type: "integer",
        description: "If branching, the thought number this branch starts from",
        minimum: 1
      },
      branchId: {
        type: "string",
        description: "Identifier for the thought branch (if any)",
        minLength: 1,
        maxLength: 100
      },
      needsMoreThoughts: {
        type: "boolean",
        description: "If true, the process likely needs more thoughts than initially estimated"
      },
      thoughtType: {
        type: "string",
        enum: ["hypothesis", "verification"],
        description: "The type of thought: hypothesis or verification"
      },
      verificationResult: {
        type: "string",
        enum: ["confirmed", "refuted", "partial", "pending"],
        description: "Result of verification (only used with thoughtType=verification)"
      },
      relatedTo: {
        type: "array",
        items: {
          type: "integer",
          minimum: 1
        },
        description: "Array of thought numbers this relates to",
        maxItems: 50
      }
    },
    required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
  }
};

const server = new Server(
  {
    name: "sequential-thinking-server",
    version: "0.6.2",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const thinkingServer = new SequentialThinkingServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEQUENTIAL_THINKING_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "sequentialthinking") {
    return thinkingServer.processThought(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sequential Thinking MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
