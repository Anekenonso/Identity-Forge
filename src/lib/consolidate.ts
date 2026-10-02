/**
 * IdentityForge — Identity Snapshot Consolidation Engine
 * Implements Section 6.4 of the Build Plan.
 * Synthesizes episodic facts into an updated versioned snapshot (v+1).
 */

import { encodeEnvelope } from "./envelope";
import { getMemWalClient } from "./memwal-client";
import type { EvidenceLogEntry, IdentitySnapshot, RecalledFact } from "./types";

export async function consolidateIdentity(
  currentSnapshot: IdentitySnapshot | null,
  recentFacts: RecalledFact[],
  namespace?: string
): Promise<{ snapshotEnvelope: string; newVersion: number; evidence: EvidenceLogEntry }> {
  const client = getMemWalClient(namespace);
  const activeNs = namespace || process.env.MEMWAL_NAMESPACE || "identity";
  const newVersion = currentSnapshot ? currentSnapshot.version + 1 : 1;
  const t0 = Date.now();

  // Combine unique key facts into consolidated summary
  const summaryParts: string[] = [];
  if (currentSnapshot) {
    summaryParts.push(currentSnapshot.summary);
  }

  for (const fact of recentFacts) {
    if (!summaryParts.includes(fact.content)) {
      summaryParts.push(`[${fact.type.toUpperCase()}] ${fact.content}`);
    }
  }

  const consolidatedSummary = summaryParts.join(" | ");

  const envelope = encodeEnvelope({
    type: "snapshot",
    version: newVersion,
    supersedes: currentSnapshot ? currentSnapshot.id : "none",
    content: consolidatedSummary,
  });

  const res = await client.rememberAndWait(envelope, activeNs);

  const evidence: EvidenceLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    operation: "consolidate",
    namespace: activeNs,
    memory_id: res.id || null,
    blob_id: res.blob_id || null,
    latency_ms: Date.now() - t0,
    result_summary: `Consolidated snapshot v${newVersion} stored with ${summaryParts.length} identity anchors`,
    success: true,
    label: process.env.MEMWAL_KEY ? "REAL" : "SIMULATED",
  };

  return {
    snapshotEnvelope: envelope,
    newVersion,
    evidence,
  };
}
