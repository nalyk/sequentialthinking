import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import chalk from 'chalk';
import { logger } from './logging/logger.js';
import { SessionManager } from './session/session-manager.js';
import { TransportFactory } from './transports/transport-factory.js';
import { Transport } from './transports/transport.interface.js';
import { SequentialThinkingManager } from './tools/sequential-thinking-manager.js';
import { ThoughtParams } from './types/thinking.js';

const SEQUENTIAL_THINKING_DESCRIPTION = `A detailed tool for dynamic and reflective problem-solving through structured thoughts.
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
- Hypothesis generation and verification workflows

Key features:
- You can adjust totalThoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generate hypotheses and verify them systematically
- Track hypothesis status (confirmed, refuted, partial, pending)
- Provides comprehensive summaries with hypothesis tracking

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
- thoughtType: "hypothesis" for generating hypotheses, "verification" for testing them
- relatedTo: Array of thought numbers this verification relates to
- verificationResult: "confirmed", "refuted", "partial", or "pending"

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate hypotheses when appropriate and mark them as such
8. Verify hypotheses systematically and track their status
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set nextThoughtNeeded to false when truly done and a satisfactory answer is reached`;

/**
 * Format a thought for visual display with colors and borders
 */
function formatThoughtForDisplay(params: ThoughtParams): string {
  const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId, thoughtType } = params;

  let prefix = '';
  let context = '';

  if (isRevision) {
    prefix = chalk.yellow('🔄 Revision');
    context = ` (revising thought ${revisesThought})`;
  } else if (branchFromThought) {
    prefix = chalk.green('🌿 Branch');
    context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
  } else if (thoughtType === 'hypothesis') {
    prefix = chalk.magenta('🔬 Hypothesis');
    context = '';
  } else if (thoughtType === 'verification') {
    prefix = chalk.cyan('✅ Verification');
    context = ` (testing hypothesis ${params.relatedTo?.join(', ')})`;
  } else {
    prefix = chalk.blue('💭 Thought');
    context = '';
  }

  const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
  const border = '─'.repeat(Math.max(header.length - 10, thought.length) + 4); // Account for emoji width

  return `
┌${border}┐
│ ${header.padEnd(border.length - 2)} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
}

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
      name: process.env.SERVER_NAME || 'sequential-thinking',
      version: process.env.SERVER_VERSION || '2.0.0'
    });
    
    // Register the sequential thinking tool using the proper SDK API
    this.setupSequentialThinkingTool();
    
    this.serverLogger.info(`Sequential Thinking MCP Server created (version ${process.env.SERVER_VERSION || '2.0.0'})`);
  }

  /**
   * Set up the sequential thinking tool using the proper SDK API
   */
  private setupSequentialThinkingTool(): void {
    this.server.tool(
      "sequential_thinking",
      SEQUENTIAL_THINKING_DESCRIPTION,
      {
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
        verificationResult: z.enum(['confirmed', 'refuted', 'partial', 'pending']).optional().describe('Result of verification (only used with thoughtType=verification)')
      },
      async ({ thought, nextThoughtNeeded, thoughtNumber, totalThoughts, isRevision, revisesThought, branchFromThought, branchId, needsMoreThoughts, thoughtType, relatedTo, verificationResult }) => {
        return this.handleSequentialThinking({
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
          verificationResult
        });
      }
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
      // Dynamic total thoughts adjustment - like the original implementation
      if (params.thoughtNumber > params.totalThoughts) {
        params.totalThoughts = params.thoughtNumber;
      }

      // Get or create session - for now, we'll use a single session per server instance
      // In a real implementation, you'd extract session from request context
      if (!this.defaultSessionId || !this.thinkingManager.getSession(this.defaultSessionId)) {
        this.defaultSessionId = this.thinkingManager.createSession();
        this.toolLogger.info(`Created new thinking session: ${this.defaultSessionId}`);
      }
      const sessionId = this.defaultSessionId;
      
      // Add the thought to the session
      const thoughtState = this.thinkingManager.addThought(sessionId, params);
      
      // Visual output to stderr (like the original)
      const visualOutput = formatThoughtForDisplay(params);
      console.error(visualOutput);
      
      // Get current session state for metadata
      const session = this.thinkingManager.getSession(sessionId);
      const branches = session ? [...new Set(session.thoughts.filter(t => t.branchId).map(t => t.branchId!))] : [];
      
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
        
        // Enhanced final response with metadata
        const finalMetadata = {
          thoughtNumber: params.thoughtNumber,
          totalThoughts: params.totalThoughts,
          nextThoughtNeeded: params.nextThoughtNeeded,
          branches: summary.branches,
          thoughtHistoryLength: summary.totalThoughts,
          hypothesesSummary: summary.hypotheses,
          revisionsCount: summary.revisions,
          sessionComplete: true
        };
        
        summaryText += `\n\n--- Session Metadata ---\n${JSON.stringify(finalMetadata, null, 2)}`;
        
        this.toolLogger.info(`Thinking session completed: ${sessionId}`, { summary });
        
        return {
          content: [{ 
            type: 'text', 
            text: summaryText
          }]
        };
      } else {
        // Process continues - enhanced response with metadata
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
        
        // Add metadata like the original implementation
        const metadata = {
          thoughtNumber: params.thoughtNumber,
          totalThoughts: params.totalThoughts,
          nextThoughtNeeded: params.nextThoughtNeeded,
          branches: branches,
          thoughtHistoryLength: session?.thoughts.length || 0,
          sessionComplete: false
        };
        
        responseText += `\n\n${JSON.stringify(metadata, null, 2)}`;
        
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
      
      // Enhanced error response structure
      const errorResponse = {
        error: error instanceof Error ? error.message : String(error),
        status: 'failed',
        thoughtNumber: params?.thoughtNumber || 0,
        sessionId: this.defaultSessionId
      };
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(errorResponse, null, 2)
        }],
        isError: true
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
