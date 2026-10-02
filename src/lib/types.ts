/**
 * IdentityForge — Core Type Definitions
 * Data contracts for memory envelopes, write gating, telemetry, and API interactions.
 */

export type MemoryType = "persona" | "goal" | "preference" | "decision" | "history" | "snapshot";

export interface MemoryEnvelope {
  id: string;
  type: MemoryType;
  timestamp: string;
  version: number;
  supersedes: string; // prior memory id or "none"
  content: string;
  rawText: string;
  contentHash: string;
}

export interface CandidateMemory {
  type: MemoryType;
  content: string;
  confidence: number;
  supersedes?: string;
  userConfirmationRequired: boolean;
}

export interface StructuredLLMResponse {
  reply: string;
  cited_ids: string[];
  memory_candidates: CandidateMemory[];
}

export interface EvidenceLogEntry {
  id: string;
  timestamp: string;
  operation: "remember" | "recall" | "reconstruct" | "consolidate" | "forget" | "wipe";
  namespace: string;
  memory_id: string | null;
  blob_id: string | null;
  latency_ms: number;
  result_summary: string;
  success: boolean;
  label: "REAL" | "SIMULATED" | "MEASURED";
}

export interface RecalledFact {
  id: string;
  blobId: string;
  type: MemoryType;
  content: string;
  timestamp: string;
  version: number;
  supersedes: string;
  distance: number;
  rawText: string;
}

export interface IdentitySnapshot {
  id: string;
  blobId: string;
  version: number;
  timestamp: string;
  summary: string;
  supersedes: string;
}

export interface ReconstructionResult {
  snapshot: IdentitySnapshot | null;
  facts: RecalledFact[];
  effectiveFacts: RecalledFact[]; // after dropping superseded IDs
  evidence: EvidenceLogEntry[];
  isEmpty: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  citedIds?: string[];
  pendingCandidates?: CandidateMemory[];
}
