import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from './logging/logger.js';
import { SessionManager } from './session/session-manager.js';
import { TransportFactory } from './transports/transport-factory.js';
import { Transport } from './transports/transport.interface.js';
import { SequentialThinkingManager } from './tools/sequential-thinking-manager.js';
import { ThoughtParams } from './types/thinking.js';
import config from './config/index.js';

const SEQUENTIAL_THINKING_DESCRIPTION = `
Iterative reasoning tool for exploring complex problems step by step. Use numbered
thoughts to record ideas, mark revisions, create branches and track hypotheses.

When to use:
- planning or analysis that might change as you learn
- multi-step problems where context must be preserved
- situations that benefit from tracking hypotheses and their verification

Guidelines:
1. Start with an estimated totalThoughts but adjust as needed
2. Provide thoughtNumber for each step and set nextThoughtNeeded to false only when done
3. Mark isRevision and revisesThought when rethinking earlier work
4. Use branchFromThought and branchId to explore alternative approaches
5. Set thoughtType to “hypothesis” or “verification”; include relatedTo and verificationResult for verifications
6. Use needsMoreThoughts when additional analysis might be required

Parameters:
- thought: string content of the current step
- nextThoughtNeeded: boolean flag to continue
- thoughtNumber: integer sequence number
- totalThoughts: integer estimate of total steps
- isRevision?: boolean to mark a revision
- revisesThought?: integer identifying the revised thought
- branchFromThought?: integer if this starts a branch
- branchId?: string identifier for the branch
- needsMoreThoughts?: boolean indicating more analysis is required
- thoughtType?: "hypothesis" | "verification"
- relatedTo?: number[] of hypotheses being verified
- verificationResult?: "confirmed" | "refuted" | "partial" | "pending"`;

/**
 * Sequential Thinking MCP Server
 * Main server class that orchestrates all components
 */
export class SequentialThinkingServer {
  private server: McpServer;
  private sessionManager: SessionManager;
  private transportFactory: TransportFactory;
  private thinkingManager: SequentialThinkingManager;
  private transports: Transport[] = [];
  private serverLogger: any;
  private toolLogger: any;
  private defaultSessionId: string | null = null;

  /**
   * Constructor for SequentialThinkingServer
   */
  constructor() {
    // Create logger for the server
    this.serverLogger = logger.child({ component: 'server' });
    this.toolLogger = logger.child({ component: 'sequential-thinking-tool' });
    
    // Create session manager
    this.sessionManager = new SessionManager(logger.child({ component: 'session-manager' }));
    
    // Create thinking manager
    this.thinkingManager = new SequentialThinkingManager(logger.child({ component: 'thinking-manager' }));
    
    // Create transport factory
    this.transportFactory = new TransportFactory(logger.child({ component: 'transport-factory' }));
    
    // Create MCP server
    this.server = new McpServer({
      name: config.get('server.name'),
      version: config.get('server.version')
    });
    
    // Register the sequential thinking tool using the proper SDK API
    this.setupSequentialThinkingTool();
    
    this.serverLogger.info(`Sequential Thinking MCP Server created (version ${config.get('server.version')})`);
  }

  /**
   * Set up the sequential thinking tool using the proper SDK API
   */
  private setupSequentialThinkingTool(): void {
    const sequentialThinkingSchema = z
      .object({
        thought: z.string().describe('Your current thinking step'),
        nextThoughtNeeded: z.boolean().describe('Whether another thought step is needed after this'),
        thoughtNumber: z.number().int().min(1).describe('The index of this thought in the sequence'),
        totalThoughts: z.number().int().min(1).describe('The estimated total number of thoughts planned'),
        isRevision: z.boolean().optional().describe('True if revising a previous thought'),
        revisesThought: z.number().int().min(1).optional().describe('If revising, the thought number being revised'),
        branchFromThought: z.number().int().min(1).optional().describe('If branching, the thought number this branch starts from'),
        branchId: z.string().optional().describe('Identifier for the thought branch (if any)'),
        needsMoreThoughts: z.boolean().optional().describe('If true, the process likely needs more thoughts than initially estimated'),
        thoughtType: z.enum(['hypothesis', 'verification']).optional().describe('The type of thought: hypothesis or verification'),
        relatedTo: z.array(z.number().int().min(1)).optional().describe('Array of thought numbers this relates to'),
        verificationResult: z
          .enum(['confirmed', 'refuted', 'partial', 'pending'])
          .optional()
          .describe('Result of verification (only used with thoughtType=verification)')
      })
      .describe(SEQUENTIAL_THINKING_DESCRIPTION);

    this.server.tool(
      "sequential_thinking",
      SEQUENTIAL_THINKING_DESCRIPTION,
      sequentialThinkingSchema.shape,
      async (params) => this.handleSequentialThinking(params)
    );
    
    this.toolLogger.info('Sequential thinking tool properly registered with SDK');
  }

  /**
   * Handle the sequential thinking tool request
   * @param params The tool parameters
   * @returns The tool response
   */
  private async handleSequentialThinking(params: ThoughtParams): Promise<any> {
    this.toolLogger.debug('Sequential thinking tool called', { params });
    
    try {
      // Get or create session - for now, we'll use a single session per server instance
      // In a real implementation, you'd extract session from request context
      if (!this.defaultSessionId || !this.thinkingManager.getSession(this.defaultSessionId)) {
        this.defaultSessionId = this.thinkingManager.createSession();
        this.toolLogger.info(`Created new thinking session: ${this.defaultSessionId}`);
      }
      const sessionId = this.defaultSessionId;
      
      // Add the thought to the session
      const thoughtState = this.thinkingManager.addThought(sessionId, params);
      
      // Generate response based on completion status
      if (!params.nextThoughtNeeded) {
        // Process is complete, provide summary
        const summary = this.thinkingManager.getSessionSummary(sessionId);
        
        let summaryText = `Sequential thinking process complete with ${summary.totalThoughts} thoughts.\n\n`;
        
        if (summary.hypotheses.total > 0) {
          summaryText += `Hypotheses: ${summary.hypotheses.total}\n`;
          if (summary.hypotheses.confirmed > 0) summaryText += `- Confirmed: ${summary.hypotheses.confirmed}\n`;
          if (summary.hypotheses.refuted > 0) summaryText += `- Refuted: ${summary.hypotheses.refuted}\n`;
          if (summary.hypotheses.partial > 0) summaryText += `- Partially verified: ${summary.hypotheses.partial}\n`;
          if (summary.hypotheses.pending > 0) summaryText += `- Pending verification: ${summary.hypotheses.pending}\n`;
        }
        
        if (summary.branches.length > 0) {
          summaryText += `\nBranches explored: ${summary.branches.join(', ')}`;
        }
        
        if (summary.revisions > 0) {
          summaryText += `\nRevisions made: ${summary.revisions}`;
        }
        
        this.toolLogger.info(`Thinking session completed: ${sessionId}`, { summary });
        
        return {
          content: [{ 
            type: 'text', 
            text: summaryText
          }]
        };
      } else {
        // Process continues
        let responseText = `Thought ${params.thoughtNumber} recorded.`;
        
        if (params.thoughtType === 'hypothesis') {
          responseText += ' [Hypothesis noted for verification]';
        } else if (params.thoughtType === 'verification') {
          responseText += ` [Verification of hypothesis ${params.relatedTo?.join(', ')} - ${params.verificationResult}]`;
        }
        
        if (params.isRevision) {
          responseText += ` [Revision of thought ${params.revisesThought}]`;
        }
        
        if (params.branchFromThought) {
          responseText += ` [Branched from thought ${params.branchFromThought}]`;
        }
        
        this.toolLogger.debug(`Thought processed: ${params.thoughtNumber}`, { thoughtState });
        
        return {
          content: [{ 
            type: 'text', 
            text: responseText
          }]
        };
      }
    } catch (error) {
      this.toolLogger.error({ error }, 'Error processing sequential thinking request');
      
      return {
        content: [{ 
          type: 'text', 
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error processing thought'}`
        }]
      };
    }
  }

  /**
   * Initialize the server
   * This sets up all components but doesn't start the server
   */
  public async initialize(): Promise<void> {
    this.serverLogger.info('Initializing Sequential Thinking MCP Server');
    
    // Initialize transports
    this.transports = await this.transportFactory.createEnabledTransports();
    
    // Initialize each transport
    for (const transport of this.transports) {
      await transport.initialize();
    }
    
    this.serverLogger.info('Sequential Thinking MCP Server initialized');
  }

  /**
   * Start the server
   * This starts all initialized components
   */
  public async start(): Promise<void> {
    this.serverLogger.info('Starting Sequential Thinking MCP Server');
    
    // Start each transport
    for (const transport of this.transports) {
      if (transport.isEnabled()) {
        await transport.start(this.server);
      }
    }
    
    this.serverLogger.info('Sequential Thinking MCP Server started');
  }

  /**
   * Stop the server
   * This stops all components
   */
  public async stop(): Promise<void> {
    this.serverLogger.info('Stopping Sequential Thinking MCP Server');
    
    // Stop each transport
    for (const transport of this.transports) {
      await transport.stop();
    }
    
    this.serverLogger.info('Sequential Thinking MCP Server stopped');
  }
}
