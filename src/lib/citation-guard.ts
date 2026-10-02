/**
 * IdentityForge — Citation Guard & Hallucination Verifier
 * Implements Section 6.3 of the Build Plan.
 * Validates that memory claims in the assistant reply cite valid recalled memory IDs.
 */

import type { RecalledFact } from "./types";

export interface CitationVerificationResult {
  valid: boolean;
  citedIds: string[];
  validCitedFacts: RecalledFact[];
  invalidCitedIds: string[];
  requiresFallback: boolean;
  sanitizedReply: string;
}

export function verifyCitations(
  replyText: string,
  rawCitedIds: string[],
  recalledFacts: RecalledFact[]
): CitationVerificationResult {
  const recalledIdMap = new Map<string, RecalledFact>();
  for (const f of recalledFacts) {
    recalledIdMap.set(f.id, f);
    if (f.blobId) recalledIdMap.set(f.blobId, f);
  }

  // Also extract any in-text [ID: <uuid>] or [ID] citations that the model wrote directly in prose
  const extractedInTextMatches = replyText.match(/\[(?:id:)?\s*([a-zA-Z0-9_-]+)\]/gi) || [];
  const inTextIds = extractedInTextMatches.map((m) =>
    m.replace(/[\[\]]/g, "").replace(/^id:\s*/i, "").trim()
  );

  const combinedCitedIds = Array.from(new Set([...rawCitedIds, ...inTextIds]));
  const validCitedFacts: RecalledFact[] = [];
  const invalidCitedIds: string[] = [];

  for (const id of combinedCitedIds) {
    const fact = recalledIdMap.get(id);
    if (fact) {
      validCitedFacts.push(fact);
    } else {
      invalidCitedIds.push(id);
    }
  }

  // If the agent claimed specific facts but cited fictitious or nonexistent memory IDs
  const hasInvalidCitations = invalidCitedIds.length > 0;

  return {
    valid: !hasInvalidCitations,
    citedIds: combinedCitedIds,
    validCitedFacts,
    invalidCitedIds,
    requiresFallback: hasInvalidCitations,
    sanitizedReply: hasInvalidCitations
      ? "I don't have verified record of that in my memory store."
      : replyText,
  };
}
