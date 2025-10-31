import type { 
  ThoughtData, 
  ToolResponse, 
  VerificationStatus, 
  HATEOASLinks, 
  HATEOASLink,
  ElicitationResponse,
  ElicitationField,
  ToolResponseWithHATEOAS,
  DatabaseThoughtRow 
} from '@sequentialthinking/core';
import type { DurableObjectStorage } from '@cloudflare/workers-types';

export interface Env {
  THINKING_STATE: DurableObjectNamespace;
  ENABLE_HATEOAS?: string;
  ENABLE_ELICITATION?: string;
  MAX_THOUGHT_HISTORY?: string;
  MAX_BRANCHES?: string;
  MAX_THOUGHTS_PER_BRANCH?: string;
}

export class SequentialThinkingDO implements DurableObject {
  private storage: DurableObjectStorage;
  private env: Env;
  private maxThoughtHistory: number;
  private maxBranches: number;
  private maxThoughtsPerBranch: number;
  private enableHATEOAS: boolean;
  private enableElicitation: boolean;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.env = env;
    this.maxThoughtHistory = parseInt(env.MAX_THOUGHT_HISTORY || "1000", 10);
    this.maxBranches = parseInt(env.MAX_BRANCHES || "50", 10);
    this.maxThoughtsPerBranch = parseInt(env.MAX_THOUGHTS_PER_BRANCH || "100", 10);
    this.enableHATEOAS = (env.ENABLE_HATEOAS || "").toLowerCase() === "true";
    this.enableElicitation = (env.ENABLE_ELICITATION || "").toLowerCase() === "true";
  }

  async initialize() {
    // Create tables if they don't exist
    await this.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS sequences (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created TEXT NOT NULL,
        lastModified TEXT NOT NULL,
        status TEXT NOT NULL,
        thoughtCount INTEGER NOT NULL DEFAULT 0
      )
    `);

    await this.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS thoughts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequenceId TEXT,
        thoughtNumber INTEGER NOT NULL,
        thought TEXT NOT NULL,
        totalThoughts INTEGER NOT NULL,
        isRevision INTEGER DEFAULT 0,
        revisesThought INTEGER,
        branchFromThought INTEGER,
        branchId TEXT,
        nextThoughtNeeded INTEGER NOT NULL,
        thoughtType TEXT,
        verificationResult TEXT,
        relatedTo TEXT,
        created TEXT NOT NULL,
        modified TEXT NOT NULL,
        FOREIGN KEY (sequenceId) REFERENCES sequences(id)
      )
    `);

    await this.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_thoughts_sequence ON thoughts(sequenceId)
    `);

    await this.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_thoughts_number ON thoughts(thoughtNumber)
    `);
  }

  async fetch(request: Request): Promise<Response> {
    // Initialize tables on first request
    await this.initialize();

    const url = new URL(request.url);
    
    // Handle MCP tool call
    if (url.pathname === '/think' && request.method === 'POST') {
      try {
        const input = await request.json();
        const result = await this.processThought(input);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          errorCode: 'PROCESSING_ERROR',
          retryable: true,
          suggestedActions: ['Check input format', 'Retry the request'],
          contextualHelp: 'An error occurred while processing the thought.',
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle sequence search
    if (url.pathname === '/sequences/search' && request.method === 'POST') {
      try {
        const { query, limit } = await request.json() as { query?: string; limit?: number };
        const sequences = await this.searchSequences(query, limit || 10);
        return new Response(JSON.stringify(sequences), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }

  private async processThought(input: any): Promise<ToolResponse> {
    // Validate input
    const validated = this.validateThoughtData(input);

    // Check for elicitation needs if enabled
    if (this.enableElicitation) {
      const elicitationNeeded = this.checkForElicitationNeeds(validated);
      if (elicitationNeeded) {
        throw new Error(JSON.stringify({
          type: 'elicitation',
          elicitation: elicitationNeeded
        }));
      }
    }

    // Store thought
    const thoughtId = await this.storeThought(validated);

    // Get current state
    const thoughtCount = await this.getThoughtCount(validated.sequenceId);
    const branches = await this.getBranches();
    const verification = await this.getVerificationStatus();
    const unverified = await this.getUnverifiedHypotheses();

    const response: ToolResponse = {
      thoughtNumber: validated.thoughtNumber,
      totalThoughts: validated.totalThoughts,
      nextThoughtNeeded: validated.nextThoughtNeeded,
      thoughtType: validated.thoughtType,
      verificationResult: validated.verificationResult,
      isRevision: validated.isRevision,
      branches,
      thoughtHistoryLength: thoughtCount,
      relatedTo: validated.relatedTo,
      branchId: validated.branchId || null,
      currentSequenceId: validated.sequenceId || null,
      persistenceEnabled: validated.sequenceId !== null && validated.sequenceId !== undefined,
      memoryStatus: {
        thoughtHistoryLimit: this.maxThoughtHistory,
        branchLimit: this.maxBranches,
        thoughtsPerBranchLimit: this.maxThoughtsPerBranch
      },
      verificationWorkflow: {
        verificationStatus: verification,
        unverifiedHypothesesCount: unverified.length,
        unverifiedHypotheses: unverified.map(h => ({
          thoughtNumber: h.thoughtNumber,
          thought: h.thought.substring(0, 100) + (h.thought.length > 100 ? '...' : '')
        }))
      }
    };

    // Add HATEOAS links if enabled
    if (this.enableHATEOAS) {
      (response as ToolResponseWithHATEOAS)._links = this.generateHATEOASLinks('thought');
    }

    return response;
  }

  private validateThoughtData(input: any): ThoughtData & { sequenceId?: string } {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: must be an object');
    }

    if (typeof input.thought !== 'string' || input.thought.length === 0) {
      throw new Error('Invalid thought: must be a non-empty string');
    }

    if (typeof input.thoughtNumber !== 'number' || input.thoughtNumber < 1) {
      throw new Error('Invalid thoughtNumber: must be a positive number');
    }

    if (typeof input.totalThoughts !== 'number' || input.totalThoughts < 1) {
      throw new Error('Invalid totalThoughts: must be a positive number');
    }

    if (typeof input.nextThoughtNeeded !== 'boolean') {
      throw new Error('Invalid nextThoughtNeeded: must be a boolean');
    }

    return {
      thought: input.thought,
      thoughtNumber: input.thoughtNumber,
      totalThoughts: input.totalThoughts,
      nextThoughtNeeded: input.nextThoughtNeeded,
      isRevision: input.isRevision || false,
      revisesThought: input.revisesThought,
      branchFromThought: input.branchFromThought,
      branchId: input.branchId,
      thoughtType: input.thoughtType,
      verificationResult: input.verificationResult,
      relatedTo: input.relatedTo,
      sequenceId: input.sequenceId
    };
  }

  private async storeThought(thought: ThoughtData & { sequenceId?: string }): Promise<number> {
    const relatedToJson = thought.relatedTo ? JSON.stringify(thought.relatedTo) : null;
    const now = new Date().toISOString();

    const result = await this.storage.sql.exec(`
      INSERT INTO thoughts (
        sequenceId, thoughtNumber, thought, totalThoughts,
        isRevision, revisesThought, branchFromThought, branchId,
        nextThoughtNeeded, thoughtType, verificationResult, relatedTo,
        created, modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, 
      thought.sequenceId || null,
      thought.thoughtNumber,
      thought.thought,
      thought.totalThoughts,
      thought.isRevision ? 1 : 0,
      thought.revisesThought || null,
      thought.branchFromThought || null,
      thought.branchId || null,
      thought.nextThoughtNeeded ? 1 : 0,
      thought.thoughtType || null,
      thought.verificationResult || null,
      relatedToJson,
      now,
      now
    );

    return result.lastRowId || 0;
  }

  private async getThoughtCount(sequenceId?: string): Promise<number> {
    const query = sequenceId
      ? `SELECT COUNT(*) as count FROM thoughts WHERE sequenceId = ?`
      : `SELECT COUNT(*) as count FROM thoughts WHERE sequenceId IS NULL`;

    const params = sequenceId ? [sequenceId] : [];

    const result = await this.storage.sql.exec(query, ...params);
    
    return result.rows[0]?.count || 0;
  }

  private async getBranches(): Promise<string[]> {
    const result = await this.storage.sql.exec(`
      SELECT DISTINCT branchId FROM thoughts WHERE branchId IS NOT NULL
    `);
    
    return result.rows.map((row: any) => row.branchId);
  }

  private async getVerificationStatus(): Promise<VerificationStatus> {
    const result = await this.storage.sql.exec(`
      SELECT 
        verificationResult,
        COUNT(*) as count
      FROM thoughts
      WHERE thoughtType = 'verification'
      GROUP BY verificationResult
    `);

    const status: VerificationStatus = {
      confirmed: 0,
      refuted: 0,
      partial: 0,
      pending: 0
    };

    result.rows.forEach((row: any) => {
      const result = row.verificationResult as keyof VerificationStatus;
      if (result && result in status) {
        status[result] = row.count;
      }
    });

    return status;
  }

  private async getUnverifiedHypotheses(): Promise<Array<{ thoughtNumber: number; thought: string }>> {
    const result = await this.storage.sql.exec(`
      SELECT thoughtNumber, thought
      FROM thoughts
      WHERE thoughtType = 'hypothesis'
      AND thoughtNumber NOT IN (
        SELECT DISTINCT CAST(json_each.value AS INTEGER)
        FROM thoughts
        JOIN json_each(thoughts.relatedTo)
        WHERE thoughtType = 'verification'
      )
      LIMIT 10
    `);

    return result.rows.map((row: any) => ({
      thoughtNumber: row.thoughtNumber,
      thought: row.thought
    }));
  }

  private async searchSequences(query?: string, limit: number = 10): Promise<any> {
    let sql: string;
    let params: any[];

    if (query) {
      sql = `
        SELECT * FROM sequences
        WHERE title LIKE ? OR description LIKE ?
        ORDER BY lastModified DESC
        LIMIT ?
      `;
      params = [`%${query}%`, `%${query}%`, limit];
    } else {
      sql = `SELECT * FROM sequences ORDER BY lastModified DESC LIMIT ?`;
      params = [limit];
    }

    const result = await this.storage.sql.exec(sql, ...params);
    
    return {
      sequences: result.rows,
      totalCount: result.rows.length
    };
  }

  private generateHATEOASLinks(context: 'thought' | 'sequence' | 'resource', data?: any): HATEOASLinks {
    const links: HATEOASLinks = {};

    if (context === 'thought') {
      links.self = {
        href: "tool://sequentialthinking",
        method: "CALL",
        description: "Add sequential thinking steps"
      };

      links.searchSequences = {
        href: "tool://sequentialthinking", 
        method: "CALL",
        description: "Search for saved sequences",
        schema: {
          searchSequence: {
            query: "string (optional)",
            limit: "number (optional, 1-50)"
          }
        }
      };

      links.resources = {
        href: "resources://list",
        method: "GET",
        description: "View all available resources"
      };

      links.prompts = {
        href: "prompts://list",
        method: "GET", 
        description: "View all thinking templates"
      };
    } else if (context === 'sequence') {
      links.self = {
        href: "sequences://library",
        method: "GET",
        description: "Browse all saved sequences"
      };

      links.search = {
        href: "tool://sequentialthinking",
        method: "CALL",
        description: "Search sequences by title, description, or content"
      };

      links.createNew = {
        href: "tool://sequentialthinking",
        method: "CALL",
        description: "Start new thinking sequence"
      };
    } else if (context === 'resource') {
      links.self = {
        href: data?.uri || "resource://unknown",
        method: "GET"
      };

      links.allResources = {
        href: "resources://list",
        method: "GET",
        description: "View all available resources"
      };
    }

    return links;
  }

  private checkForElicitationNeeds(validatedInput: ThoughtData & { sequenceId?: string }): ElicitationResponse | null {
    // Scenario 1: Branch created without branchId
    if (validatedInput.branchFromThought && !validatedInput.branchId) {
      return {
        title: "Branch Identifier Required",
        description: "You're creating a new branch. Please provide an identifier to help track this alternative reasoning path.",
        fields: [
          {
            type: "string",
            name: "branchId",
            description: "Identifier for this branch (e.g., 'alternative-approach', 'stakeholder-view')",
            required: true,
            validation: {
              min: 1,
              max: 100,
              pattern: "^[a-zA-Z0-9-_]+$"
            }
          }
        ]
      };
    }

    // Scenario 2: Verification thought without related hypotheses
    if (validatedInput.thoughtType === 'verification' &&
        (!validatedInput.relatedTo || validatedInput.relatedTo.length === 0)) {
      
      // For Cloudflare Workers, we need to get hypotheses from storage
      return {
        title: "Link Verification to Hypothesis",
        description: "This verification should be linked to one or more hypotheses. Please provide the thought numbers you are verifying.",
        fields: [
          {
            type: "string",
            name: "relatedTo",
            description: "Comma-separated thought numbers (e.g., '1,3,5')",
            required: true,
            validation: {
              pattern: "^\\d+(,\\d+)*$"
            }
          }
        ]
      };
    }

    return null;
  }
}
