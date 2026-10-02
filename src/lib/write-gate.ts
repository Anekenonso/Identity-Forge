/**
 * IdentityForge — Deterministic Write Gate
 * Implements Section 6.2 of the Build Plan.
 * Rule: AI proposes candidates; deterministic code owns write authority.
 */

import { hashContent } from "./envelope.js";
import type { CandidateMemory, MemoryType, RecalledFact } from "./types.js";

const VALID_TYPES: Set<MemoryType> = new Set([
  "persona",
  "goal",
  "preference",
  "decision",
  "history",
  "snapshot",
]);

const MAX_CONTENT_LENGTH = 300;
const MAX_WRITES_PER_TURN = 5;

export interface WriteGateDecision {
  accepted: boolean;
  requiresUserConfirmation: boolean;
  reason: string;
  candidate: CandidateMemory;
}

export interface GateTurnResult {
  acceptedCandidates: CandidateMemory[];
  pendingConfirmationCandidates: CandidateMemory[];
  rejectedCandidates: { candidate: CandidateMemory; reason: string }[];
}

/**
 * Evaluates candidate memories proposed by the LLM against code-enforced invariants.
 */
export function evaluateWriteGate(
  proposedCandidates: CandidateMemory[],
  recalledFacts: RecalledFact[],
  userMessage: string
): GateTurnResult {
  const acceptedCandidates: CandidateMemory[] = [];
  const pendingConfirmationCandidates: CandidateMemory[] = [];
  const rejectedCandidates: { candidate: CandidateMemory; reason: string }[] = [];

  const existingHashes = new Set(recalledFacts.map((f) => hashContent(f.content)));
  const sessionHashesThisTurn = new Set<string>();

  let writesAcceptedCount = 0;

  for (const candidate of proposedCandidates) {
    // 1. Rate Cap check
    if (writesAcceptedCount >= MAX_WRITES_PER_TURN) {
      rejectedCandidates.push({
        candidate,
        reason: `Exceeded maximum of ${MAX_WRITES_PER_TURN} writes per turn`,
      });
      continue;
    }

    // 2. Allowlist type check
    if (!VALID_TYPES.has(candidate.type)) {
      rejectedCandidates.push({
        candidate,
        reason: `Invalid memory type: "${candidate.type}". Must be one of: ${Array.from(VALID_TYPES).join(", ")}`,
      });
      continue;
    }

    // 3. Length caps
    if (!candidate.content || candidate.content.trim().length === 0) {
      rejectedCandidates.push({
        candidate,
        reason: "Memory content cannot be empty",
      });
      continue;
    }

    if (candidate.content.length > MAX_CONTENT_LENGTH) {
      rejectedCandidates.push({
        candidate,
        reason: `Content exceeds ${MAX_CONTENT_LENGTH} character limit (${candidate.content.length} chars)`,
      });
      continue;
    }

    // 4. Deduplication via Hash
    const cHash = hashContent(candidate.content);
    if (existingHashes.has(cHash) || sessionHashesThisTurn.has(cHash)) {
      rejectedCandidates.push({
        candidate,
        reason: "Duplicate memory: fact or exact equivalent already exists in memory store",
      });
      continue;
    }

    sessionHashesThisTurn.add(cHash);
    writesAcceptedCount++;

    // 5. User Confirmation requirement for persona and goal
    if (candidate.type === "persona" || candidate.type === "goal") {
      pendingConfirmationCandidates.push({
        ...candidate,
        userConfirmationRequired: true,
      });
    } else {
      acceptedCandidates.push({
        ...candidate,
        userConfirmationRequired: false,
      });
    }
  }

  return {
    acceptedCandidates,
    pendingConfirmationCandidates,
    rejectedCandidates,
  };
}
