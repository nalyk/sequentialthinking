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

export interface HATEOASLink {
  href: string;
  method?: string;
  description?: string;
  schema?: object;
  condition?: string;
  count?: number;
}

export interface HATEOASLinks {
  self?: HATEOASLink;
  [key: string]: HATEOASLink | undefined;
}

export interface ElicitationField {
  type: 'string' | 'number' | 'boolean' | 'enum';
  name: string;
  description: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ElicitationResponse {
  title: string;
  description: string;
  fields: ElicitationField[];
}

// Database row interfaces
export interface DatabaseSequenceRow {
  id: string;
  title: string;
  description: string | null;
  created: string;
  lastModified: string;
  status: string;
  thoughtCount: number;
}

export interface DatabaseThoughtRow {
  id: number;
  sequenceId: string | null;
  thoughtNumber: number;
  thought: string;
  totalThoughts: number;
  isRevision: number;
  revisesThought: number | null;
  branchFromThought: number | null;
  branchId: string | null;
  nextThoughtNeeded: number;
  thoughtType: string | null;
  verificationResult: string | null;
  relatedTo: string | null;
  created: string;
  modified: string;
}

// Resource interfaces with optional HATEOAS
export interface BaseResourceData {
  [key: string]: any;
}

export interface ResourceWithHATEOAS<T = BaseResourceData> extends T {
  _links?: HATEOASLinks;
}

export interface ToolResponseWithHATEOAS extends ToolResponse {
  _links?: HATEOASLinks;
}

export interface EnhancedErrorWithHATEOAS extends EnhancedError {
  _links?: HATEOASLinks;
}
