#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from 'chalk';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface SequenceRecord {
  id: string;
  title: string;
  description?: string;
  created: Date;
  lastModified: Date;
  status: 'active' | 'completed' | 'archived';
  thoughtCount: number;
}

interface ThoughtRecord extends ThoughtData {
  id: string;
  sequenceId: string;
  created: Date;
  modified: Date;
}

interface SequenceThoughtData extends ThoughtData {
  sequenceId?: string;
  saveSequence?: {
    title: string;
    description?: string;
  };
  loadSequence?: {
    id: string;
  };
  searchSequence?: {
    query?: string;
    limit?: number;
    contentSearch?: boolean;
  };
  exportSequence?: {
    id: string;
  };
  importSequence?: {
    data: {
      sequence: SequenceRecord;
      thoughts: ThoughtRecord[];
    };
  };
}

class SequentialThinkingServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private disableThoughtLogging: boolean;
  private readonly maxThoughtHistory: number;
  private readonly maxBranches: number;
  private readonly maxThoughtsPerBranch: number;
  private db: sqlite3.Database | null = null;
  private currentSequenceId: string | null = null;

  constructor() {
    this.disableThoughtLogging = (process.env.DISABLE_THOUGHT_LOGGING || "").toLowerCase() === "true";
    this.maxThoughtHistory = parseInt(process.env.MAX_THOUGHT_HISTORY || "1000", 10);
    this.maxBranches = parseInt(process.env.MAX_BRANCHES || "50", 10);
    this.maxThoughtsPerBranch = parseInt(process.env.MAX_THOUGHTS_PER_BRANCH || "100", 10);
    this.initializeDatabase();
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

  private normalizeDiacritics(text: string): string {
    // Normalize Romanian diacritics
    const romanianMap: { [key: string]: string } = {
      'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ţ': 't', 'ț': 't',
      'Ă': 'A', 'Â': 'A', 'Î': 'I', 'Ș': 'S', 'Ţ': 'T', 'Ț': 'T'
    };
    
    // Normalize Russian/Cyrillic common characters (basic transliteration)
    const cyrillicMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };

    let normalized = text.toLowerCase();
    
    // Apply Romanian diacritics normalization
    for (const [diacritic, replacement] of Object.entries(romanianMap)) {
      normalized = normalized.replace(new RegExp(diacritic, 'g'), replacement.toLowerCase());
    }
    
    // Apply Cyrillic transliteration
    for (const [cyrillic, replacement] of Object.entries(cyrillicMap)) {
      normalized = normalized.replace(new RegExp(cyrillic, 'g'), replacement.toLowerCase());
    }
    
    return normalized;
  }

  private initializeDatabase(): void {
    try {
      const dbPath = path.join(__dirname, 'sequences.db');
      this.db = new sqlite3.Database(dbPath);
      
      // Create tables if they don't exist
      this.db.serialize(() => {
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS sequences (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            created DATETIME DEFAULT CURRENT_TIMESTAMP,
            lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
            thoughtCount INTEGER DEFAULT 0
          )
        `);

        this.db!.run(`
          CREATE TABLE IF NOT EXISTS thoughts (
            id TEXT PRIMARY KEY,
            sequenceId TEXT NOT NULL,
            thought TEXT NOT NULL,
            thoughtNumber INTEGER NOT NULL,
            totalThoughts INTEGER NOT NULL,
            isRevision BOOLEAN DEFAULT 0,
            revisesThought INTEGER,
            branchFromThought INTEGER,
            branchId TEXT,
            needsMoreThoughts BOOLEAN DEFAULT 0,
            nextThoughtNeeded BOOLEAN NOT NULL,
            thoughtType TEXT CHECK (thoughtType IN ('hypothesis', 'verification')),
            verificationResult TEXT CHECK (verificationResult IN ('confirmed', 'refuted', 'partial', 'pending')),
            relatedTo TEXT, -- JSON array of numbers
            created DATETIME DEFAULT CURRENT_TIMESTAMP,
            modified DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sequenceId) REFERENCES sequences (id) ON DELETE CASCADE
          )
        `);

        this.db!.run(`
          CREATE INDEX IF NOT EXISTS idx_thoughts_sequence ON thoughts(sequenceId);
        `);

        this.db!.run(`
          CREATE INDEX IF NOT EXISTS idx_thoughts_number ON thoughts(sequenceId, thoughtNumber);
        `);

        // Create FTS virtual table for full-text search on thought content
        this.db!.run(`
          CREATE VIRTUAL TABLE IF NOT EXISTS thoughts_fts USING fts5(
            thought,
            content='thoughts',
            content_rowid='rowid'
          );
        `);

        // Create triggers to keep FTS table in sync with thoughts table
        this.db!.run(`
          CREATE TRIGGER IF NOT EXISTS thoughts_fts_insert AFTER INSERT ON thoughts BEGIN
            INSERT INTO thoughts_fts(rowid, thought) VALUES (new.rowid, new.thought);
          END;
        `);

        this.db!.run(`
          CREATE TRIGGER IF NOT EXISTS thoughts_fts_update AFTER UPDATE ON thoughts BEGIN
            UPDATE thoughts_fts SET thought = new.thought WHERE rowid = new.rowid;
          END;
        `);

        this.db!.run(`
          CREATE TRIGGER IF NOT EXISTS thoughts_fts_delete AFTER DELETE ON thoughts BEGIN
            DELETE FROM thoughts_fts WHERE rowid = old.rowid;
          END;
        `);
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async createSequence(title: string, description?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const id = this.generateId();
      const now = new Date().toISOString();
      
      this.db.run(
        'INSERT INTO sequences (id, title, description, created, lastModified) VALUES (?, ?, ?, ?, ?)',
        [id, title, description || null, now, now],
        function(err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve(id);
          }
        }
      );
    });
  }

  private async loadSequence(id: string): Promise<SequenceRecord | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(
        'SELECT * FROM sequences WHERE id = ?',
        [id],
        (err: Error | null, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            resolve({
              id: row.id,
              title: row.title,
              description: row.description,
              created: new Date(row.created),
              lastModified: new Date(row.lastModified),
              status: row.status,
              thoughtCount: row.thoughtCount
            });
          }
        }
      );
    });
  }

  private async loadSequenceThoughts(sequenceId: string): Promise<ThoughtRecord[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(
        'SELECT * FROM thoughts WHERE sequenceId = ? ORDER BY thoughtNumber ASC',
        [sequenceId],
        (err: Error | null, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const thoughts: ThoughtRecord[] = rows.map(row => ({
              id: row.id,
              sequenceId: row.sequenceId,
              thought: row.thought,
              thoughtNumber: row.thoughtNumber,
              totalThoughts: row.totalThoughts,
              isRevision: Boolean(row.isRevision),
              revisesThought: row.revisesThought,
              branchFromThought: row.branchFromThought,
              branchId: row.branchId,
              needsMoreThoughts: Boolean(row.needsMoreThoughts),
              nextThoughtNeeded: Boolean(row.nextThoughtNeeded),
              thoughtType: row.thoughtType,
              verificationResult: row.verificationResult,
              relatedTo: row.relatedTo ? JSON.parse(row.relatedTo) : undefined,
              created: new Date(row.created),
              modified: new Date(row.modified)
            }));
            resolve(thoughts);
          }
        }
      );
    });
  }

  private async exportSequence(sequenceId: string): Promise<{ sequence: SequenceRecord; thoughts: ThoughtRecord[] }> {
    const sequence = await this.loadSequence(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence with id ${sequenceId} not found`);
    }
    const thoughts = await this.loadSequenceThoughts(sequenceId);
    return { sequence, thoughts };
  }

  private async importSequence(data: { sequence: SequenceRecord; thoughts: ThoughtRecord[] }): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const newSequenceId = this.generateId();
      const now = new Date().toISOString();
      
      // Insert sequence
      const self = this;
      this.db.run(
        'INSERT INTO sequences (id, title, description, created, lastModified, status, thoughtCount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newSequenceId, data.sequence.title, data.sequence.description, now, now, 'active', data.thoughts.length],
        function(sequenceErr: Error | null) {
          if (sequenceErr) {
            reject(sequenceErr);
            return;
          }

          // Insert thoughts
          const insertThought = (thought: ThoughtRecord, callback: (err?: Error) => void) => {
            const thoughtId = self.generateId();
            self.db!.run(
              'INSERT INTO thoughts (id, sequenceId, thought, thoughtNumber, totalThoughts, isRevision, revisesThought, branchFromThought, branchId, needsMoreThoughts, nextThoughtNeeded, thoughtType, verificationResult, relatedTo, created, modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                thoughtId,
                newSequenceId,
                thought.thought,
                thought.thoughtNumber,
                thought.totalThoughts,
                thought.isRevision ? 1 : 0,
                thought.revisesThought,
                thought.branchFromThought,
                thought.branchId,
                thought.needsMoreThoughts ? 1 : 0,
                thought.nextThoughtNeeded ? 1 : 0,
                thought.thoughtType,
                thought.verificationResult,
                thought.relatedTo ? JSON.stringify(thought.relatedTo) : null,
                now,
                now
              ],
              callback
            );
          };

          // Insert all thoughts sequentially
          let thoughtIndex = 0;
          const insertNextThought = () => {
            if (thoughtIndex >= data.thoughts.length) {
              resolve(newSequenceId);
              return;
            }
            
            insertThought(data.thoughts[thoughtIndex], (err?: Error) => {
              if (err) {
                reject(err);
                return;
              }
              thoughtIndex++;
              insertNextThought();
            });
          };
          
          insertNextThought();
        }
      );
    });
  }

  private async saveThought(thought: ThoughtData, sequenceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const thoughtId = this.generateId();
      const now = new Date().toISOString();
      
      this.db.run(
        `INSERT INTO thoughts (
          id, sequenceId, thought, thoughtNumber, totalThoughts,
          isRevision, revisesThought, branchFromThought, branchId,
          needsMoreThoughts, nextThoughtNeeded, thoughtType,
          verificationResult, relatedTo, created, modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          thoughtId, sequenceId, thought.thought, thought.thoughtNumber, thought.totalThoughts,
          thought.isRevision ? 1 : 0, thought.revisesThought, thought.branchFromThought, thought.branchId,
          thought.needsMoreThoughts ? 1 : 0, thought.nextThoughtNeeded ? 1 : 0, thought.thoughtType,
          thought.verificationResult, thought.relatedTo ? JSON.stringify(thought.relatedTo) : null, now, now
        ],
        function(err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  private async updateSequenceModified(sequenceId: string, thoughtCount: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date().toISOString();
      
      this.db.run(
        'UPDATE sequences SET lastModified = ?, thoughtCount = ? WHERE id = ?',
        [now, thoughtCount, sequenceId],
        function(err: Error | null) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  private calculateFuzzyScore(query: string, target: string): number {
    const normalizedQuery = this.normalizeDiacritics(query);
    const normalizedTarget = this.normalizeDiacritics(target);
    
    // Exact match gets highest score
    if (normalizedTarget === normalizedQuery) {
      return 100;
    }
    
    // Contains match gets high score
    if (normalizedTarget.includes(normalizedQuery)) {
      return 80;
    }
    
    // Word boundary match gets medium score
    const words = normalizedTarget.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(normalizedQuery)) {
        return 60;
      }
    }
    
    // Simple fuzzy matching using common subsequence
    const commonSubsequenceLength = this.longestCommonSubsequence(normalizedQuery, normalizedTarget);
    const similarity = (commonSubsequenceLength * 2) / (normalizedQuery.length + normalizedTarget.length);
    
    return Math.round(similarity * 40); // Max 40 points for fuzzy match
  }

  private longestCommonSubsequence(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    return dp[m][n];
  }

  private async searchSequences(query?: string, limit: number = 10, contentSearch?: boolean): Promise<{ sequences: SequenceRecord[], totalCount: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      // If no query provided, list all sequences
      if (!query || query.trim() === '') {
        this.db.all(
          'SELECT * FROM sequences ORDER BY lastModified DESC LIMIT ?',
          [limit],
          (err: Error | null, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const sequences: SequenceRecord[] = rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description,
                created: new Date(row.created),
                lastModified: new Date(row.lastModified),
                status: row.status,
                thoughtCount: row.thoughtCount
              }));
              resolve({ sequences, totalCount: sequences.length });
            }
          }
        );
        return;
      }

      // Search with fuzzy matching and optional content search
      if (contentSearch) {
        // Use FTS to search thought content
        this.db.all(
          `SELECT DISTINCT s.* FROM sequences s 
           JOIN thoughts t ON s.id = t.sequenceId 
           JOIN thoughts_fts fts ON t.rowid = fts.rowid 
           WHERE thoughts_fts MATCH ? 
           ORDER BY s.lastModified DESC 
           LIMIT ?`,
          [query, limit],
          (err: Error | null, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const sequences: SequenceRecord[] = rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description,
                created: new Date(row.created),
                lastModified: new Date(row.lastModified),
                status: row.status,
                thoughtCount: row.thoughtCount
              }));
              resolve({ sequences, totalCount: sequences.length });
            }
          }
        );
      } else {
        // Original fuzzy search on titles and descriptions
        this.db.all(
          'SELECT * FROM sequences',
          [],
          (err: Error | null, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const sequences: SequenceRecord[] = rows.map(row => ({
                id: row.id,
                title: row.title,
                description: row.description,
                created: new Date(row.created),
                lastModified: new Date(row.lastModified),
                status: row.status,
                thoughtCount: row.thoughtCount
              }));

              // Calculate fuzzy scores and filter
              const scoredSequences = sequences.map(seq => {
                const titleScore = this.calculateFuzzyScore(query, seq.title);
                const descriptionScore = seq.description ? this.calculateFuzzyScore(query, seq.description) : 0;
                const maxScore = Math.max(titleScore, descriptionScore);
                
                return {
                  sequence: seq,
                  score: maxScore,
                  titleScore,
                  descriptionScore
                };
              }).filter(item => item.score > 20) // Only show sequences with reasonable match
                .sort((a, b) => {
                  // Sort by score first, then by lastModified
                  if (a.score !== b.score) {
                    return b.score - a.score;
                  }
                  return b.sequence.lastModified.getTime() - a.sequence.lastModified.getTime();
                })
                .slice(0, limit);

              const results = scoredSequences.map(item => item.sequence);
              resolve({ sequences: results, totalCount: results.length });
            }
          }
        );
      }
    });
  }

  private validateSequenceThoughtData(input: unknown): SequenceThoughtData {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: must be an object');
    }

    const data = input as Record<string, unknown>;

    // Validate sequence-specific fields
    if (data.sequenceId !== undefined && (typeof data.sequenceId !== 'string' || data.sequenceId.length === 0)) {
      throw new Error('Invalid sequenceId: must be a non-empty string');
    }

    if (data.saveSequence !== undefined) {
      if (typeof data.saveSequence !== 'object' || data.saveSequence === null) {
        throw new Error('Invalid saveSequence: must be an object');
      }
      const saveData = data.saveSequence as Record<string, unknown>;
      if (typeof saveData.title !== 'string' || saveData.title.length === 0) {
        throw new Error('Invalid saveSequence.title: must be a non-empty string');
      }
      if (saveData.description !== undefined && typeof saveData.description !== 'string') {
        throw new Error('Invalid saveSequence.description: must be a string');
      }
    }

    if (data.loadSequence !== undefined) {
      if (typeof data.loadSequence !== 'object' || data.loadSequence === null) {
        throw new Error('Invalid loadSequence: must be an object');
      }
      const loadData = data.loadSequence as Record<string, unknown>;
      if (typeof loadData.id !== 'string' || loadData.id.length === 0) {
        throw new Error('Invalid loadSequence.id: must be a non-empty string');
      }
    }

    if (data.searchSequence !== undefined) {
      if (typeof data.searchSequence !== 'object' || data.searchSequence === null) {
        throw new Error('Invalid searchSequence: must be an object');
      }
      const searchData = data.searchSequence as Record<string, unknown>;
      if (searchData.query !== undefined && (typeof searchData.query !== 'string' || searchData.query.length === 0)) {
        throw new Error('Invalid searchSequence.query: must be a non-empty string');
      }
      if (searchData.limit !== undefined && (typeof searchData.limit !== 'number' || searchData.limit < 1 || searchData.limit > 50)) {
        throw new Error('Invalid searchSequence.limit: must be a number between 1 and 50');
      }
      if (searchData.contentSearch !== undefined && typeof searchData.contentSearch !== 'boolean') {
        throw new Error('Invalid searchSequence.contentSearch: must be a boolean');
      }
    }

    if (data.exportSequence !== undefined) {
      if (typeof data.exportSequence !== 'object' || data.exportSequence === null) {
        throw new Error('Invalid exportSequence: must be an object');
      }
      const exportData = data.exportSequence as Record<string, unknown>;
      if (typeof exportData.id !== 'string' || exportData.id.length === 0) {
        throw new Error('Invalid exportSequence.id: must be a non-empty string');
      }
    }

    if (data.importSequence !== undefined) {
      if (typeof data.importSequence !== 'object' || data.importSequence === null) {
        throw new Error('Invalid importSequence: must be an object');
      }
      const importData = data.importSequence as Record<string, unknown>;
      if (typeof importData.data !== 'object' || importData.data === null) {
        throw new Error('Invalid importSequence.data: must be an object');
      }
      // TODO: Add more detailed validation for sequence and thoughts data
    }

    // Validate base thought data
    const baseData = this.validateThoughtData(data);

    return {
      ...baseData,
      sequenceId: data.sequenceId as string | undefined,
      saveSequence: data.saveSequence as { title: string; description?: string } | undefined,
      loadSequence: data.loadSequence as { id: string } | undefined,
      searchSequence: data.searchSequence as { query?: string; limit?: number; contentSearch?: boolean } | undefined,
      exportSequence: data.exportSequence as { id: string } | undefined,
      importSequence: data.importSequence as { data: { sequence: SequenceRecord; thoughts: ThoughtRecord[] } } | undefined
    };
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

  public async getCurrentSequenceResource(): Promise<object> {
    const currentSequence = this.currentSequenceId ? await this.loadSequence(this.currentSequenceId) : null;
    const verificationStatus = this.getVerificationStatus();
    const unverifiedHypotheses = this.getHypothesesNeedingVerification();
    
    return {
      id: this.currentSequenceId,
      title: currentSequence?.title || null,
      thoughtCount: this.thoughtHistory.length,
      verificationStatus,
      lastThought: this.thoughtHistory.length > 0 ? this.thoughtHistory[this.thoughtHistory.length - 1].thought : null,
      unverifiedHypothesesCount: unverifiedHypotheses.length,
      persistenceEnabled: this.currentSequenceId !== null,
      totalBranches: Object.keys(this.branches).length
    };
  }

  public async getSequenceLibraryResource(): Promise<object> {
    const searchResults = await this.searchSequences(undefined, 50);
    return {
      sequences: searchResults.sequences,
      totalCount: searchResults.totalCount,
      recentActivity: {
        totalSequences: searchResults.totalCount,
        lastModified: searchResults.sequences.length > 0 ? searchResults.sequences[0].lastModified : null
      }
    };
  }

  public async getThinkingPatternsResource(): Promise<object> {
    const searchResults = await this.searchSequences(undefined, 1000);
    const sequences = searchResults.sequences;
    
    const totalThoughts = sequences.reduce((sum, seq) => sum + seq.thoughtCount, 0);
    const averageThoughtsPerSequence = sequences.length > 0 ? totalThoughts / sequences.length : 0;
    
    const verificationStatus = this.getVerificationStatus();
    const totalVerifications = verificationStatus.confirmed + verificationStatus.refuted + verificationStatus.partial + verificationStatus.pending;
    const verificationRate = totalVerifications > 0 ? verificationStatus.confirmed / totalVerifications : 0;
    
    // Analyze thought relationships from current memory
    const relationshipAnalysis = this.analyzeThoughtRelationships();
    
    return {
      totalSequences: sequences.length,
      totalThoughts,
      averageThoughtsPerSequence: Math.round(averageThoughtsPerSequence * 100) / 100,
      verificationRate: Math.round(verificationRate * 100) / 100,
      relationshipPatterns: relationshipAnalysis,
      currentMemoryUsage: {
        thoughtHistory: this.thoughtHistory.length,
        branches: Object.keys(this.branches).length,
        memoryLimits: {
          thoughtHistoryLimit: this.maxThoughtHistory,
          branchLimit: this.maxBranches,
          thoughtsPerBranchLimit: this.maxThoughtsPerBranch
        }
      }
    };
  }

  private analyzeThoughtRelationships(): object {
    const relationships: { [key: number]: number[] } = {};
    const connectionCounts: { [key: number]: number } = {};
    
    // Analyze relationships in current thought history
    this.thoughtHistory.forEach(thought => {
      if (thought.relatedTo && thought.relatedTo.length > 0) {
        relationships[thought.thoughtNumber] = thought.relatedTo;
        
        // Count connections
        thought.relatedTo.forEach(relatedThought => {
          connectionCounts[relatedThought] = (connectionCounts[relatedThought] || 0) + 1;
        });
      }
    });
    
    // Find most connected thoughts
    const mostConnectedThoughts = Object.entries(connectionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([thoughtNumber, connections]) => ({
        thoughtNumber: parseInt(thoughtNumber),
        connections,
        thought: this.thoughtHistory.find(t => t.thoughtNumber === parseInt(thoughtNumber))?.thought.substring(0, 100) + '...' || 'Unknown'
      }));
    
    // Calculate relationship density
    const totalThoughts = this.thoughtHistory.length;
    const thoughtsWithRelationships = Object.keys(relationships).length;
    const relationshipDensity = totalThoughts > 0 ? thoughtsWithRelationships / totalThoughts : 0;
    
    return {
      totalRelationships: Object.keys(relationships).length,
      relationshipDensity: Math.round(relationshipDensity * 100) / 100,
      mostConnectedThoughts,
      relationshipMap: relationships
    };
  }

  public async getVerificationStatusResource(): Promise<object> {
    const verificationStatus = this.getVerificationStatus();
    const unverifiedHypotheses = this.getHypothesesNeedingVerification();
    
    return {
      verificationStatus,
      unverifiedHypothesesCount: unverifiedHypotheses.length,
      unverifiedHypotheses: unverifiedHypotheses.map(h => ({
        thoughtNumber: h.thoughtNumber,
        thought: h.thought.substring(0, 100) + (h.thought.length > 100 ? '...' : ''),
        timestamp: new Date().toISOString()
      })),
      verificationRate: verificationStatus.confirmed + verificationStatus.refuted + verificationStatus.partial + verificationStatus.pending > 0 
        ? verificationStatus.confirmed / (verificationStatus.confirmed + verificationStatus.refuted + verificationStatus.partial + verificationStatus.pending)
        : 0
    };
  }

  public async getRecentThoughtsResource(): Promise<object> {
    const recentThoughts = this.thoughtHistory.slice(-10);
    
    return {
      recentThoughts: recentThoughts.map(thought => ({
        thoughtNumber: thought.thoughtNumber,
        thought: thought.thought.substring(0, 200) + (thought.thought.length > 200 ? '...' : ''),
        thoughtType: thought.thoughtType,
        verificationResult: thought.verificationResult,
        isRevision: thought.isRevision,
        branchId: thought.branchId,
        relatedTo: thought.relatedTo || [],
        connectionCount: thought.relatedTo ? thought.relatedTo.length : 0,
        timestamp: new Date().toISOString()
      })),
      totalThoughts: this.thoughtHistory.length,
      activityMetrics: {
        revisionsCount: this.thoughtHistory.filter(t => t.isRevision).length,
        branchesCount: Object.keys(this.branches).length,
        hypothesesCount: this.thoughtHistory.filter(t => t.thoughtType === 'hypothesis').length,
        verificationsCount: this.thoughtHistory.filter(t => t.thoughtType === 'verification').length
      }
    };
  }

  public generatePrompt(name: string, args: Record<string, string>): string {
    switch (name) {
      case "start_analysis":
        return this.generateStartAnalysisPrompt(args);
      case "hypothesis_verification":
        return this.generateHypothesisVerificationPrompt(args);
      case "sequence_synthesis":
        return this.generateSequenceSynthesisPrompt(args);
      case "branch_exploration":
        return this.generateBranchExplorationPrompt(args);
      case "problem_decomposition":
        return this.generateProblemDecompositionPrompt(args);
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private generateStartAnalysisPrompt(args: Record<string, string>): string {
    const problem = args.problem || "[Problem to analyze]";
    const context = args.context || "[Relevant context and constraints]";
    const goals = args.goals || "[Analysis goals and objectives]";

    return `# Systematic Analysis Framework

## Problem Definition
${problem}

## Context & Constraints
${context}

## Analysis Goals
${goals}

## Initial Hypotheses
- Hypothesis 1: [First potential explanation or solution]
- Hypothesis 2: [Alternative explanation or approach]
- Hypothesis 3: [Additional perspective to consider]

## Evidence Gathering Plan
1. [First source of information to investigate]
2. [Second type of evidence to collect]
3. [Third validation approach]

## Analysis Structure
1. **Problem Decomposition**: Break down the main problem into smaller, manageable parts
2. **Hypothesis Generation**: Develop multiple potential explanations or solutions
3. **Evidence Collection**: Gather relevant data and information
4. **Hypothesis Testing**: Systematically evaluate each hypothesis
5. **Synthesis**: Combine insights into actionable conclusions

## Next Steps
- Begin with: [First concrete action to take]
- Key questions to address: [Critical questions that need answers]
- Success criteria: [How to measure progress and success]`;
  }

  private generateHypothesisVerificationPrompt(args: Record<string, string>): string {
    const hypothesis = args.hypothesis || "[Hypothesis to verify]";
    const evidenceSources = args.evidence_sources || "[Available evidence sources]";
    const testMethods = args.test_methods || "[Methods for testing]";

    return `# Hypothesis Verification Framework

## Hypothesis Statement
${hypothesis}

## Verification Approach

### Evidence Sources
${evidenceSources}

### Testing Methods
${testMethods}

## Verification Steps

### 1. Evidence Collection
- [ ] Primary evidence: [Main source of validation]
- [ ] Secondary evidence: [Supporting information]
- [ ] Contradictory evidence: [Look for counter-examples]

### 2. Testing Criteria
- **Confirmation criteria**: What evidence would confirm this hypothesis?
- **Refutation criteria**: What evidence would refute this hypothesis?
- **Partial confirmation**: What would suggest the hypothesis is partially correct?

### 3. Evaluation Framework
- **Strength of evidence**: How reliable and comprehensive is the evidence?
- **Alternative explanations**: Are there other ways to interpret the evidence?
- **Confidence level**: How certain can we be about the conclusion?

## Verification Results
- **Status**: [Confirmed/Refuted/Partial/Pending]
- **Key evidence**: [Most important supporting or contradicting evidence]
- **Confidence**: [Low/Medium/High]
- **Implications**: [What this means for the broader analysis]

## Next Actions
- [ ] If confirmed: [Next steps based on confirmed hypothesis]
- [ ] If refuted: [Alternative approaches to consider]
- [ ] If partial: [Areas needing further investigation]`;
  }

  private generateSequenceSynthesisPrompt(args: Record<string, string>): string {
    const sequenceTitle = args.sequence_title || "[Sequence Title]";
    const focusAreas = args.focus_areas || "[Areas to focus on]";

    return `# Thinking Sequence Synthesis

## Sequence Overview
**Title**: ${sequenceTitle}
**Focus Areas**: ${focusAreas}

## Key Insights Summary

### Primary Findings
1. [First major insight or conclusion]
2. [Second significant finding]
3. [Third important realization]

### Supporting Evidence
- [Key evidence that supports the main findings]
- [Additional validation or confirmation]
- [Patterns identified across different thoughts]

## Thought Evolution Analysis

### Initial Assumptions
- [What was initially assumed or believed]
- [Starting hypotheses or approaches]

### Refinements and Revisions
- [How thinking evolved throughout the sequence]
- [Key turning points or moments of insight]
- [Assumptions that were challenged or changed]

### Final Position
- [Current understanding or conclusion]
- [Confidence level in the findings]

## Decision Points and Actions

### Key Decisions Made
1. [Important decision reached]
2. [Another significant choice]
3. [Additional decision or conclusion]

### Action Items
- [ ] [Immediate action to take]
- [ ] [Follow-up task or investigation]
- [ ] [Long-term objective or goal]

### Unresolved Issues
- [Questions that remain unanswered]
- [Areas requiring further investigation]
- [Potential future considerations]

## Reflection and Learning

### What Worked Well
- [Effective thinking strategies used]
- [Successful approaches or methods]

### Areas for Improvement
- [Aspects that could be enhanced]
- [Different approaches to consider next time]

### Lessons Learned
- [Key insights about the thinking process itself]
- [Patterns to remember for future analysis]`;
  }

  private generateBranchExplorationPrompt(args: Record<string, string>): string {
    const originalApproach = args.original_approach || "[Original approach or perspective]";
    const stakeholders = args.stakeholders || "[Relevant stakeholders]";
    const constraints = args.constraints || "[Constraints and limitations]";

    return `# Alternative Perspective Exploration

## Original Approach
${originalApproach}

## Stakeholder Analysis
**Key Stakeholders**: ${stakeholders}

### Perspective 1: [First Stakeholder]
- **Priorities**: [What matters most to this stakeholder]
- **Concerns**: [Potential objections or worries]
- **Preferred approach**: [How they would handle this situation]
- **Success metrics**: [How they would measure success]

### Perspective 2: [Second Stakeholder]
- **Priorities**: [What matters most to this stakeholder]
- **Concerns**: [Potential objections or worries]
- **Preferred approach**: [How they would handle this situation]
- **Success metrics**: [How they would measure success]

### Perspective 3: [Third Stakeholder]
- **Priorities**: [What matters most to this stakeholder]
- **Concerns**: [Potential objections or worries]
- **Preferred approach**: [How they would handle this situation]
- **Success metrics**: [How they would measure success]

## Constraint Analysis
**Current Constraints**: ${constraints}

### Alternative Scenarios
- **If constraint X was removed**: [How would the approach change?]
- **If we had more time**: [What additional options would be available?]
- **If resources were unlimited**: [What would be the ideal approach?]

## Devil's Advocate Analysis
- **Potential flaws in original approach**: [What could go wrong?]
- **Overlooked factors**: [What might have been missed?]
- **Unintended consequences**: [What negative outcomes might occur?]

## Alternative Approaches

### Option A: [First Alternative]
- **Description**: [How this approach differs]
- **Advantages**: [Benefits of this approach]
- **Disadvantages**: [Potential drawbacks]
- **Feasibility**: [How realistic this option is]

### Option B: [Second Alternative]
- **Description**: [How this approach differs]
- **Advantages**: [Benefits of this approach]
- **Disadvantages**: [Potential drawbacks]
- **Feasibility**: [How realistic this option is]

### Option C: [Third Alternative]
- **Description**: [How this approach differs]
- **Advantages**: [Benefits of this approach]
- **Disadvantages**: [Potential drawbacks]
- **Feasibility**: [How realistic this option is]

## Integration and Synthesis
- **Common themes**: [What appears across multiple perspectives]
- **Complementary approaches**: [How different perspectives might work together]
- **Hybrid solutions**: [Combinations of different approaches]

## Next Steps
- [ ] [Immediate action to explore alternatives]
- [ ] [Stakeholder consultation or feedback]
- [ ] [Pilot testing or small-scale implementation]`;
  }

  private generateProblemDecompositionPrompt(args: Record<string, string>): string {
    const mainProblem = args.main_problem || "[Main problem to decompose]";
    const complexityLevel = args.complexity_level || "[Complexity assessment]";
    const domain = args.domain || "[Problem domain]";

    return `# Problem Decomposition Framework

## Problem Overview
**Main Problem**: ${mainProblem}
**Complexity Level**: ${complexityLevel}
**Domain**: ${domain}

## Problem Breakdown

### Level 1: Primary Components
1. **Component A**: [First major aspect of the problem]
   - Description: [What this component involves]
   - Difficulty: [How challenging this part is]
   - Dependencies: [What this depends on]

2. **Component B**: [Second major aspect]
   - Description: [What this component involves]
   - Difficulty: [How challenging this part is]
   - Dependencies: [What this depends on]

3. **Component C**: [Third major aspect]
   - Description: [What this component involves]
   - Difficulty: [How challenging this part is]
   - Dependencies: [What this depends on]

### Level 2: Sub-Components
#### Component A Sub-tasks:
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]

#### Component B Sub-tasks:
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]

#### Component C Sub-tasks:
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] [Specific task 3]

## Dependency Analysis

### Critical Path
1. [First step that must be completed]
2. [Second step that depends on the first]
3. [Third step in the sequence]

### Parallel Workstreams
- **Stream 1**: [Tasks that can be done simultaneously]
- **Stream 2**: [Independent tasks that can run in parallel]
- **Stream 3**: [Additional parallel work]

## Priority Assessment

### High Priority (Critical)
- [Most important components to address first]
- [Components that block other work]

### Medium Priority (Important)
- [Components that are significant but not blocking]
- [Items that enhance the solution]

### Low Priority (Nice-to-have)
- [Components that can be addressed later]
- [Enhancements or optimizations]

## Resource Requirements

### For Component A:
- **Skills needed**: [Required expertise]
- **Time estimate**: [How long this might take]
- **Resources**: [What's needed to complete this]

### For Component B:
- **Skills needed**: [Required expertise]
- **Time estimate**: [How long this might take]
- **Resources**: [What's needed to complete this]

### For Component C:
- **Skills needed**: [Required expertise]
- **Time estimate**: [How long this might take]
- **Resources**: [What's needed to complete this]

## Risk Assessment
- **High-risk components**: [Parts most likely to cause problems]
- **Mitigation strategies**: [How to reduce risks]
- **Contingency plans**: [Alternative approaches if things go wrong]

## Success Metrics
- **Component A success**: [How to measure completion]
- **Component B success**: [How to measure completion]
- **Component C success**: [How to measure completion]
- **Overall success**: [How to measure total problem resolution]

## Implementation Plan
1. **Phase 1**: [First set of components to tackle]
2. **Phase 2**: [Second phase of work]
3. **Phase 3**: [Final phase or ongoing work]

## Next Actions
- [ ] [Immediate first step]
- [ ] [Second priority action]
- [ ] [Third step in the process]`;
  }

  public async processThought(input: unknown): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    try {
      const validatedInput = this.validateSequenceThoughtData(input);

      // Handle sequence searching if requested
      if (validatedInput.searchSequence) {
        const searchResults = await this.searchSequences(
          validatedInput.searchSequence.query,
          validatedInput.searchSequence.limit || 10,
          validatedInput.searchSequence.contentSearch || false
        );
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: 'sequences_searched',
              query: validatedInput.searchSequence.query || null,
              results: searchResults.sequences.map(seq => ({
                id: seq.id,
                title: seq.title,
                description: seq.description,
                thoughtCount: seq.thoughtCount,
                status: seq.status,
                created: seq.created,
                lastModified: seq.lastModified
              })),
              totalCount: searchResults.totalCount,
              message: validatedInput.searchSequence.query 
                ? `Found ${searchResults.totalCount} sequences matching "${validatedInput.searchSequence.query}"`
                : `Listed ${searchResults.totalCount} sequences`
            }, null, 2)
          }]
        };
      }

      // Handle sequence export if requested
      if (validatedInput.exportSequence) {
        const exportData = await this.exportSequence(validatedInput.exportSequence.id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(exportData, null, 2)
          }]
        };
      }

      // Handle sequence import if requested
      if (validatedInput.importSequence) {
        const newSequenceId = await this.importSequence(validatedInput.importSequence.data);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: `Sequence imported successfully with ID: ${newSequenceId}`,
              sequenceId: newSequenceId,
              thoughtCount: validatedInput.importSequence.data.thoughts.length
            }, null, 2)
          }]
        };
      }

      // Handle sequence loading if requested
      if (validatedInput.loadSequence) {
        const sequence = await this.loadSequence(validatedInput.loadSequence.id);
        if (!sequence) {
          throw new Error(`Sequence not found: ${validatedInput.loadSequence.id}`);
        }
        
        // Load the sequence thoughts into memory
        const sequenceThoughts = await this.loadSequenceThoughts(sequence.id);
        this.thoughtHistory = sequenceThoughts;
        this.currentSequenceId = sequence.id;
        
        // Rebuild branches from loaded thoughts
        this.branches = {};
        sequenceThoughts.forEach(thought => {
          if (thought.branchFromThought && thought.branchId) {
            if (!this.branches[thought.branchId]) {
              this.branches[thought.branchId] = [];
            }
            this.branches[thought.branchId].push(thought);
          }
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: 'sequence_loaded',
              sequence: {
                id: sequence.id,
                title: sequence.title,
                description: sequence.description,
                thoughtCount: sequence.thoughtCount,
                status: sequence.status,
                lastModified: sequence.lastModified
              },
              thoughtsLoaded: sequenceThoughts.length,
              message: `Loaded sequence "${sequence.title}" with ${sequenceThoughts.length} thoughts`
            }, null, 2)
          }]
        };
      }

      // Handle sequence saving if requested
      if (validatedInput.saveSequence) {
        const sequenceId = await this.createSequence(
          validatedInput.saveSequence.title,
          validatedInput.saveSequence.description
        );
        
        // Save all current thoughts to the sequence
        for (const thought of this.thoughtHistory) {
          await this.saveThought(thought, sequenceId);
        }
        
        await this.updateSequenceModified(sequenceId, this.thoughtHistory.length);
        this.currentSequenceId = sequenceId;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              action: 'sequence_saved',
              sequenceId: sequenceId,
              title: validatedInput.saveSequence.title,
              thoughtsSaved: this.thoughtHistory.length,
              message: `Saved sequence "${validatedInput.saveSequence.title}" with ${this.thoughtHistory.length} thoughts`
            }, null, 2)
          }]
        };
      }

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

      // Save to database if we have a current sequence
      if (this.currentSequenceId) {
        await this.saveThought(validatedInput, this.currentSequenceId);
        await this.updateSequenceModified(this.currentSequenceId, this.thoughtHistory.length);
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
        currentSequenceId: this.currentSequenceId,
        persistenceEnabled: this.currentSequenceId !== null,
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

const THINKING_PROMPTS: Record<string, Prompt> = {
  start_analysis: {
    name: "start_analysis",
    description: "Structured framework for beginning systematic analysis",
    arguments: [
      {
        name: "problem",
        description: "The main problem or question to analyze",
        required: true
      },
      {
        name: "context",
        description: "Relevant background information and constraints",
        required: false
      },
      {
        name: "goals",
        description: "What you want to achieve through this analysis",
        required: false
      }
    ]
  },
  hypothesis_verification: {
    name: "hypothesis_verification",
    description: "Template for systematically verifying a hypothesis",
    arguments: [
      {
        name: "hypothesis",
        description: "The hypothesis to verify",
        required: true
      },
      {
        name: "evidence_sources",
        description: "Available sources of evidence",
        required: false
      },
      {
        name: "test_methods",
        description: "Methods for testing the hypothesis",
        required: false
      }
    ]
  },
  sequence_synthesis: {
    name: "sequence_synthesis",
    description: "Template for synthesizing insights from completed thinking sequences",
    arguments: [
      {
        name: "sequence_title",
        description: "Title of the sequence being synthesized",
        required: false
      },
      {
        name: "focus_areas",
        description: "Specific areas to focus on in the synthesis",
        required: false
      }
    ]
  },
  branch_exploration: {
    name: "branch_exploration",
    description: "Template for exploring alternative perspectives and approaches",
    arguments: [
      {
        name: "original_approach",
        description: "The original approach or perspective",
        required: true
      },
      {
        name: "stakeholders",
        description: "Different stakeholders to consider",
        required: false
      },
      {
        name: "constraints",
        description: "Constraints that might affect alternatives",
        required: false
      }
    ]
  },
  problem_decomposition: {
    name: "problem_decomposition",
    description: "Template for breaking down complex problems into manageable parts",
    arguments: [
      {
        name: "main_problem",
        description: "The main problem to decompose",
        required: true
      },
      {
        name: "complexity_level",
        description: "How complex the problem appears to be",
        required: false
      },
      {
        name: "domain",
        description: "The domain or field this problem belongs to",
        required: false
      }
    ]
  }
};

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
- PERSISTENT SEQUENCES: Save and load thinking sequences across sessions
- Continue complex reasoning over days or weeks
- Build on previous conclusions and insights
- ENHANCED SEARCH: Full-text search across thought content with contentSearch parameter
- EXPORT/IMPORT: Complete sequence backup and sharing capabilities
- RELATIONSHIP INSIGHTS: Enhanced resources show thought connections and patterns

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
- saveSequence: Object with 'title' and optional 'description' to save current thoughts as a sequence
- loadSequence: Object with 'id' to load a previously saved sequence
- searchSequence: Object with 'query', 'limit', and 'contentSearch' to search sequences with fuzzy matching and full-text search
- exportSequence: Object with 'id' to export sequence as JSON for backup/sharing
- importSequence: Object with 'data' to import sequence from JSON backup
- sequenceId: ID of the current sequence (for continuing existing sequences)

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
11. Only set nextThoughtNeeded to false when truly done and a satisfactory answer is reached`,
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
      },
      sequenceId: {
        type: "string",
        description: "ID of the current sequence (for continuing existing sequences)"
      },
      saveSequence: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title for the sequence to save",
            minLength: 1
          },
          description: {
            type: "string",
            description: "Optional description for the sequence"
          }
        },
        required: ["title"],
        description: "Save current thoughts as a sequence"
      },
      loadSequence: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the sequence to load",
            minLength: 1
          }
        },
        required: ["id"],
        description: "Load a previously saved sequence"
      },
      searchSequence: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for sequence titles and descriptions (optional - if not provided, lists all sequences)",
            minLength: 1
          },
          limit: {
            type: "integer",
            description: "Maximum number of results to return (default: 10)",
            minimum: 1,
            maximum: 50
          },
          contentSearch: {
            type: "boolean",
            description: "If true, search within thought content using full-text search (default: false)"
          }
        },
        description: "Search for sequences by title/description or within thought content"
      },
      exportSequence: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the sequence to export",
            minLength: 1
          }
        },
        required: ["id"],
        description: "Export sequence as JSON for backup or sharing"
      },
      importSequence: {
        type: "object",
        properties: {
          data: {
            type: "object",
            description: "Sequence data to import (must contain sequence and thoughts)",
            properties: {
              sequence: {
                type: "object",
                description: "Sequence metadata"
              },
              thoughts: {
                type: "array",
                description: "Array of thought records",
                items: {
                  type: "object"
                }
              }
            },
            required: ["sequence", "thoughts"]
          }
        },
        required: ["data"],
        description: "Import sequence from JSON backup"
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
      resources: {},
      prompts: {},
    },
  }
);

const thinkingServer = new SequentialThinkingServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEQUENTIAL_THINKING_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "sequentialthinking") {
    return await thinkingServer.processThought(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "sequence://current",
        name: "Current Sequence",
        description: "Live current thinking sequence data",
        mimeType: "application/json"
      },
      {
        uri: "sequences://library",
        name: "Sequence Library",
        description: "Browse all saved sequences",
        mimeType: "application/json"
      },
      {
        uri: "patterns://analysis",
        name: "Thinking Patterns",
        description: "User thinking patterns analysis",
        mimeType: "application/json"
      },
      {
        uri: "verification://status",
        name: "Verification Status",
        description: "Real-time verification dashboard",
        mimeType: "application/json"
      },
      {
        uri: "thoughts://recent",
        name: "Recent Thoughts",
        description: "Recent thoughts across all sequences",
        mimeType: "application/json"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  try {
    let resourceData: object;
    
    switch (uri) {
      case "sequence://current":
        resourceData = await thinkingServer.getCurrentSequenceResource();
        break;
      case "sequences://library":
        resourceData = await thinkingServer.getSequenceLibraryResource();
        break;
      case "patterns://analysis":
        resourceData = await thinkingServer.getThinkingPatternsResource();
        break;
      case "verification://status":
        resourceData = await thinkingServer.getVerificationStatusResource();
        break;
      case "thoughts://recent":
        resourceData = await thinkingServer.getRecentThoughtsResource();
        break;
      default:
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ error: `Unknown resource: ${uri}` }, null, 2)
          }]
        };
    }
    
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(resourceData, null, 2)
      }]
    };
  } catch (error) {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ 
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(THINKING_PROMPTS)
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};
  
  try {
    const promptText = thinkingServer.generatePrompt(name, args);
    
    return {
      description: THINKING_PROMPTS[name]?.description || "Thinking framework template",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText
          }
        }
      ]
    };
  } catch (error) {
    return {
      description: "Error generating prompt",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        }
      ]
    };
  }
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
