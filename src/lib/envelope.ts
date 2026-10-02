/**
 * IdentityForge — Memory Envelope Encoding & Parsing
 * Implements the IF1 data contract defined in Section 5.1 of the Build Plan.
 */

import * as crypto from "node:crypto";
import type { MemoryEnvelope, MemoryType, RecalledFact } from "./types.js";

const VALID_TYPES: Set<MemoryType> = new Set([
  "persona",
  "goal",
  "preference",
  "decision",
  "history",
  "snapshot",
]);

/**
 * Normalizes text content for deterministic idempotency hashing.
 * Lowercases, strips punctuation, collapses whitespace.
 */
export function normalizeContent(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Calculates SHA-256 hash of normalized content.
 */
export function hashContent(text: string): string {
  const normalized = normalizeContent(text);
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Formats a memory into the IF1 wire format string.
 * Example:
 * [IF1|id=4a7b...|type=preference|ts=2026-10-02T16:00:00.000Z|v=1|supersedes=none]
 * User prefers TypeScript and dark mode.
 */
export function encodeEnvelope(params: {
  id?: string;
  type: MemoryType;
  timestamp?: string;
  version?: number;
  supersedes?: string;
  content: string;
}): string {
  const id = params.id || crypto.randomUUID();
  const timestamp = params.timestamp || new Date().toISOString();
  const version = params.version || 1;
  const supersedes = params.supersedes || "none";
  const cleanContent = params.content.trim().replace(/\r?\n/g, " ");

  const header = `[IF1|id=${id}|type=${params.type}|ts=${timestamp}|v=${version}|supersedes=${supersedes}]`;
  return `${header}\n${cleanContent}`;
}

/**
 * Parses an IF1 envelope string into a structured MemoryEnvelope.
 * Gracefully handles legacy or unformatted strings.
 */
export function parseEnvelope(rawText: string, fallbackBlobId?: string): MemoryEnvelope {
  const headerMatch = rawText.match(/^\[IF1\|id=([^|]+)\|type=([^|]+)\|ts=([^|]+)\|v=(\d+)\|supersedes=([^\]]+)\]\s*\n?([\s\S]*)$/);

  if (headerMatch) {
    const [, id, typeStr, timestamp, vStr, supersedes, content] = headerMatch;
    const type = VALID_TYPES.has(typeStr as MemoryType) ? (typeStr as MemoryType) : "history";
    const cleanContent = content.trim();

    return {
      id,
      type,
      timestamp,
      version: parseInt(vStr, 10) || 1,
      supersedes: supersedes.trim(),
      content: cleanContent,
      rawText,
      contentHash: hashContent(cleanContent),
    };
  }

  // Fallback for raw text without IF1 header
  const cleanContent = rawText.trim();
  const syntheticId = fallbackBlobId || crypto.createHash("md5").update(cleanContent).digest("hex").slice(0, 16);

  return {
    id: syntheticId,
    type: "history",
    timestamp: new Date().toISOString(),
    version: 1,
    supersedes: "none",
    content: cleanContent,
    rawText,
    contentHash: hashContent(cleanContent),
  };
}

/**
 * Filters out superseded memories.
 * Any memory whose ID appears in another memory's `supersedes` field is excluded.
 */
export function filterSupersededFacts(facts: RecalledFact[]): RecalledFact[] {
  const supersededIds = new Set<string>();

  for (const fact of facts) {
    if (fact.supersedes && fact.supersedes !== "none") {
      supersededIds.add(fact.supersedes);
    }
  }

  return facts.filter((fact) => !supersededIds.has(fact.id));
}
