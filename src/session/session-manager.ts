import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';

/**
 * Session data interface
 */
export interface SessionData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  data: Record<string, any>;
}

/**
 * Session manager for MCP server
 * Handles session creation, retrieval, and cleanup
 */
export class SessionManager {
  private cache: NodeCache;
  private logger: Logger;

  /**
   * Constructor for SessionManager
   * @param logger The logger instance
   */
  constructor(logger: Logger) {
    const ttl = parseInt(process.env.SESSION_TTL || '3600');
    const checkPeriod = parseInt(process.env.SESSION_CHECK_PERIOD || '60');
    
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: checkPeriod,
      useClones: false
    });
    
    this.logger = logger;
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.logger.info(`Session manager initialized with TTL: ${ttl}s, check period: ${checkPeriod}s`);
  }

  /**
   * Set up event listeners for the cache
   */
  private setupEventListeners(): void {
    this.cache.on('expired', (key, value) => {
      this.logger.debug(`Session expired: ${key}`);
    });
    
    this.cache.on('del', (key, value) => {
      this.logger.debug(`Session deleted: ${key}`);
    });
    
    this.cache.on('flush', () => {
      this.logger.debug('All sessions flushed');
    });
  }

  /**
   * Create a new session
   * @param initialData Optional initial data for the session
   * @returns The created session
   */
  public createSession(initialData: Record<string, any> = {}): SessionData {
    const id = uuidv4();
    const now = new Date();
    
    const session: SessionData = {
      id,
      createdAt: now,
      updatedAt: now,
      data: initialData
    };
    
    this.cache.set(id, session);
    this.logger.debug(`Session created: ${id}`);
    
    return session;
  }

  /**
   * Get a session by ID
   * @param id The session ID
   * @returns The session data, or null if not found
   */
  public getSession(id: string): SessionData | null {
    const session = this.cache.get<SessionData>(id);
    
    if (!session) {
      this.logger.debug(`Session not found: ${id}`);
      return null;
    }
    
    return session;
  }

  /**
   * Update a session
   * @param id The session ID
   * @param data The data to update
   * @returns The updated session, or null if not found
   */
  public updateSession(id: string, data: Record<string, any>): SessionData | null {
    const session = this.getSession(id);
    
    if (!session) {
      return null;
    }
    
    session.updatedAt = new Date();
    session.data = { ...session.data, ...data };
    
    this.cache.set(id, session);
    this.logger.debug(`Session updated: ${id}`);
    
    return session;
  }

  /**
   * Delete a session
   * @param id The session ID
   * @returns True if the session was deleted, false otherwise
   */
  public deleteSession(id: string): boolean {
    const deleted = this.cache.del(id);
    
    if (deleted > 0) {
      this.logger.debug(`Session deleted: ${id}`);
      return true;
    }
    
    this.logger.debug(`Session not found for deletion: ${id}`);
    return false;
  }

  /**
   * Get all sessions
   * @returns All sessions
   */
  public getAllSessions(): SessionData[] {
    const keys = this.cache.keys();
    const sessions: SessionData[] = [];
    
    for (const key of keys) {
      const session = this.cache.get<SessionData>(key);
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  /**
   * Clear all sessions
   */
  public clearAllSessions(): void {
    this.cache.flushAll();
    this.logger.debug('All sessions cleared');
  }

  /**
   * Get the number of active sessions
   * @returns The number of active sessions
   */
  public getSessionCount(): number {
    return this.cache.keys().length;
  }
}
