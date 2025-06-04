import { v4 as uuidv4 } from 'uuid';
import { ThoughtParams, ThoughtState, ThinkingSession, ThinkingSummary } from '../types/thinking.js';

/**
 * Sequential Thinking Manager
 * Handles the core logic for sequential thinking processes
 */
export class SequentialThinkingManager {
  private sessions: Map<string, ThinkingSession> = new Map();
  private logger: any;

  constructor(logger: any) {
    this.logger = logger.child({ component: 'sequential-thinking-manager' });
  }

  /**
   * Create a new thinking session
   */
  public createSession(): string {
    const sessionId = uuidv4();
    const session: ThinkingSession = {
      id: sessionId,
      thoughts: [],
      totalThoughts: 0,
      isComplete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      hypotheses: new Map(),
      verifications: new Map()
    };

    this.sessions.set(sessionId, session);
    this.logger.debug(`Created new thinking session: ${sessionId}`);
    return sessionId;
  }
  /**
   * Add a thought to a session
   */
  public addThought(sessionId: string, params: ThoughtParams): ThoughtState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Validate thought number sequence
    this.validateThoughtSequence(session, params);

    // Create the thought state
    const thoughtState: ThoughtState = {
      id: uuidv4(),
      sessionId,
      thoughtNumber: params.thoughtNumber,
      content: params.thought,
      timestamp: new Date(),
      isRevision: params.isRevision || false,
      revisesThought: params.revisesThought,
      branchFromThought: params.branchFromThought,
      branchId: params.branchId,
      thoughtType: params.thoughtType,
      relatedTo: params.relatedTo,
      verificationResult: params.verificationResult
    };

    // Add to session
    session.thoughts.push(thoughtState);
    session.totalThoughts = params.totalThoughts;
    session.updatedAt = new Date();
    session.isComplete = !params.nextThoughtNeeded;

    // Track hypotheses and verifications
    if (params.thoughtType === 'hypothesis') {
      session.hypotheses.set(params.thoughtNumber, thoughtState);
    } else if (params.thoughtType === 'verification') {
      session.verifications.set(params.thoughtNumber, thoughtState);
    }

    this.logger.debug(`Added thought ${params.thoughtNumber} to session ${sessionId}`);
    return thoughtState;
  }

  /**
   * Validate thought sequence logic
   */
  private validateThoughtSequence(session: ThinkingSession, params: ThoughtParams): void {
    // Check for duplicate thought numbers (unless it's a revision)
    if (!params.isRevision) {
      const existingThought = session.thoughts.find(t => t.thoughtNumber === params.thoughtNumber && !t.isRevision);
      if (existingThought) {
        throw new Error(`Thought number ${params.thoughtNumber} already exists. Use isRevision: true to revise.`);
      }
    }

    // Validate revision logic
    if (params.isRevision) {
      if (!params.revisesThought) {
        throw new Error('revisesThought is required when isRevision is true');
      }
      const originalThought = session.thoughts.find(t => t.thoughtNumber === params.revisesThought);
      if (!originalThought) {
        throw new Error(`Cannot revise non-existent thought ${params.revisesThought}`);
      }
    }

    // Validate branch logic
    if (params.branchFromThought) {
      const branchPoint = session.thoughts.find(t => t.thoughtNumber === params.branchFromThought);
      if (!branchPoint) {
        throw new Error(`Cannot branch from non-existent thought ${params.branchFromThought}`);
      }
    }

    // Validate verification logic
    if (params.thoughtType === 'verification' && params.relatedTo) {
      for (const relatedThought of params.relatedTo) {
        const hypothesis = session.hypotheses.get(relatedThought);
        if (!hypothesis) {
          throw new Error(`Cannot verify non-existent hypothesis ${relatedThought}`);
        }
      }
    }
  }

  /**
   * Get session summary
   */
  public getSessionSummary(sessionId: string): ThinkingSummary {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const hypotheses = Array.from(session.hypotheses.values());
    const branches = [...new Set(session.thoughts.filter(t => t.branchId).map(t => t.branchId!))];
    const revisions = session.thoughts.filter(t => t.isRevision).length;

    const hypothesesStatus = {
      total: hypotheses.length,
      confirmed: 0,
      refuted: 0,
      partial: 0,
      pending: 0
    };

    // Count hypothesis statuses by checking related verifications
    for (const hypothesis of hypotheses) {
      const verifications = session.thoughts.filter(t => 
        t.thoughtType === 'verification' && 
        t.relatedTo?.includes(hypothesis.thoughtNumber)
      );
      
      if (verifications.length === 0) {
        hypothesesStatus.pending++;
      } else {
        const latestVerification = verifications[verifications.length - 1];
        switch (latestVerification.verificationResult) {
          case 'confirmed':
            hypothesesStatus.confirmed++;
            break;
          case 'refuted':
            hypothesesStatus.refuted++;
            break;
          case 'partial':
            hypothesesStatus.partial++;
            break;
          default:
            hypothesesStatus.pending++;
        }
      }
    }

    return {
      totalThoughts: session.thoughts.length,
      hypotheses: hypothesesStatus,
      branches,
      revisions,
      isComplete: session.isComplete
    };
  }

  /**
   * Get session
   */
  public getSession(sessionId: string): ThinkingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Delete session
   */
  public deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.logger.debug(`Deleted thinking session: ${sessionId}`);
    }
    return deleted;
  }
}
