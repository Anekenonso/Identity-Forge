/**
 * IdentityForge — POST /api/chat
 * Primary stateless orchestration route.
 * Reconstructs from Walrus, calls LLM, verifies citations, gates writes, and streams evidence.
 */

import { NextResponse } from "next/server";
import { verifyCitations } from "@/lib/citation-guard";
import { encodeEnvelope } from "@/lib/envelope";
import { generateChatResponse } from "@/lib/llm-client";
import { getMemWalClient } from "@/lib/memwal-client";
import { buildReconstructedSystemPrompt, reconstructIdentity } from "@/lib/reconstruct";
import type { EvidenceLogEntry } from "@/lib/types";
import { evaluateWriteGate } from "@/lib/write-gate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, namespace, modelOverride } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message string required" }, { status: 400 });
    }

    const activeNamespace = namespace || process.env.MEMWAL_NAMESPACE || "identity";
    const telemetryEvidence: EvidenceLogEntry[] = [];

    // Step 1: Reconstruct identity cold from Walrus Memory
    const reconstruction = await reconstructIdentity(message, activeNamespace);
    telemetryEvidence.push(...reconstruction.evidence);

    // Step 2: Assemble prompt and invoke LLM
    const activeModel = modelOverride || process.env.PRIMARY_MODEL_ID || "deepseek-chat";
    const systemPrompt = buildReconstructedSystemPrompt(reconstruction, activeModel);

    const t0Inference = Date.now();
    const rawLLMResponse = await generateChatResponse(systemPrompt, message, {
      modelOverride,
    });

    telemetryEvidence.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: "reconstruct",
      namespace: activeNamespace,
      memory_id: null,
      blob_id: null,
      latency_ms: Date.now() - t0Inference,
      result_summary: `LLM inference completed with ${rawLLMResponse.cited_ids.length} citations and ${rawLLMResponse.memory_candidates.length} candidates proposed`,
      success: true,
      label: "MEASURED",
    });

    // Step 3: Citation Verification & Anti-Hallucination
    const citationResult = verifyCitations(
      rawLLMResponse.reply,
      rawLLMResponse.cited_ids,
      reconstruction.effectiveFacts
    );

    // Step 4: Deterministic Write Gate
    const writeGateResult = evaluateWriteGate(
      rawLLMResponse.memory_candidates,
      reconstruction.effectiveFacts,
      message
    );

    // Step 5: Persist auto-accepted memories to Walrus
    const client = getMemWalClient(activeNamespace);
    const persistedMemories: any[] = [];

    for (const accepted of writeGateResult.acceptedCandidates) {
      const t0Write = Date.now();
      const envelope = encodeEnvelope({
        type: accepted.type,
        content: accepted.content,
      });

      try {
        const res = await client.rememberAndWait(envelope, activeNamespace);
        persistedMemories.push({
          type: accepted.type,
          content: accepted.content,
          blob_id: res.blob_id || res.id,
        });

        telemetryEvidence.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          operation: "remember",
          namespace: activeNamespace,
          memory_id: res.id || null,
          blob_id: res.blob_id || null,
          latency_ms: Date.now() - t0Write,
          result_summary: `Saved auto-accepted [${accepted.type}]: "${accepted.content.slice(0, 40)}..."`,
          success: true,
          label: process.env.MEMWAL_KEY ? "REAL" : "SIMULATED",
        });
      } catch (writeErr: any) {
        telemetryEvidence.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          operation: "remember",
          namespace: activeNamespace,
          memory_id: null,
          blob_id: null,
          latency_ms: Date.now() - t0Write,
          result_summary: `Write failed for [${accepted.type}]: ${writeErr.message}`,
          success: false,
          label: process.env.MEMWAL_KEY ? "REAL" : "SIMULATED",
        });
      }
    }

    return NextResponse.json({
      reply: citationResult.sanitizedReply,
      citations: citationResult.validCitedFacts,
      invalid_citations: citationResult.invalidCitedIds,
      persisted_memories: persistedMemories,
      pending_confirmations: writeGateResult.pendingConfirmationCandidates,
      rejected_candidates: writeGateResult.rejectedCandidates,
      evidence: telemetryEvidence,
      reconstructed_state: {
        snapshot_version: reconstruction.snapshot?.version ?? null,
        facts_count: reconstruction.effectiveFacts.length,
        is_clean_slate: reconstruction.isEmpty,
      },
    });
  } catch (error: any) {
    console.error("API /api/chat uncaught error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
