// Shared types for Sequential Thinking MCP server

export interface ThoughtData {
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

export interface SequenceRecord {
  id: string;
  title: string;
  description: string | null;
  created: string;
  lastModified: string;
  status: 'active' | 'completed' | 'archived';
  thoughtCount: number;
}

export interface VerificationStatus {
  confirmed: number;
  refuted: number;
  partial: number;
  pending: number;
}

export interface MemoryStatus {
  thoughtHistoryLimit: number;
  branchLimit: number;
  thoughtsPerBranchLimit: number;
}

export interface ToolResponse {
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  thoughtType?: 'hypothesis' | 'verification';
  verificationResult?: 'confirmed' | 'refuted' | 'partial' | 'pending';
  isRevision?: boolean;
  branches: string[];
  thoughtHistoryLength: number;
  relatedTo?: number[];
  branchId?: string | null;
  currentSequenceId: string | null;
  persistenceEnabled: boolean;
  memoryStatus: MemoryStatus;
  verificationWorkflow: {
    verificationStatus: VerificationStatus;
    unverifiedHypothesesCount: number;
    unverifiedHypotheses: Array<{
      thoughtNumber: number;
      thought: string;
    }>;
  };
}

export interface EnhancedError {
  error: string;
  errorCode: string;
  retryable: boolean;
  suggestedActions: string[];
  contextualHelp: string;
  timestamp: string;
}
