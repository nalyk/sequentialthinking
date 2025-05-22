/**
 * Types for Sequential Thinking functionality
 */

export interface ThoughtParams {
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

export interface ThoughtState {
  id: string;
  sessionId: string;
  thoughtNumber: number;
  content: string;
  timestamp: Date;
  isRevision: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  thoughtType?: 'hypothesis' | 'verification';
  relatedTo?: number[];
  verificationResult?: 'confirmed' | 'refuted' | 'partial' | 'pending';
}

export interface ThinkingSession {
  id: string;
  thoughts: ThoughtState[];
  totalThoughts: number;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
  hypotheses: Map<number, ThoughtState>;
  verifications: Map<number, ThoughtState>;
}

export interface ThinkingSummary {
  totalThoughts: number;
  hypotheses: {
    total: number;
    confirmed: number;
    refuted: number;
    partial: number;
    pending: number;
  };
  branches: string[];
  revisions: number;
  isComplete: boolean;
}
