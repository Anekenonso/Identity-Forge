/**
 * IdentityForge — POST /api/confirm-memory
 * Executes user-confirmed memory writes for persona and goal candidates.
 * Enforces the core rule: code + explicit user confirmation controls state mutation.
 */

import { NextResponse } from "next/server";
import { encodeEnvelope } from "@/lib/envelope";
import { getMemWalClient } from "@/lib/memwal-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { confirmed, candidate, namespace } = body;

    if (!confirmed) {
      return NextResponse.json({
        success: true,
        action: "rejected",
        message: "Candidate memory write discarded by user.",
      });
    }

    if (!candidate || !candidate.type || !candidate.content) {
      return NextResponse.json({ error: "Invalid candidate memory payload" }, { status: 400 });
    }

    const activeNamespace = namespace || process.env.MEMWAL_NAMESPACE || "identity";
    const client = getMemWalClient(activeNamespace);

    const t0 = Date.now();
    const envelope = encodeEnvelope({
      type: candidate.type,
      content: candidate.content,
    });

    const res = await client.rememberAndWait(envelope, activeNamespace);
    const latency = Date.now() - t0;

    return NextResponse.json({
      success: true,
      action: "stored",
      memory: {
        id: res.id,
        blob_id: res.blob_id,
        type: candidate.type,
        content: candidate.content,
        latency_ms: latency,
      },
      evidence: {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation: "remember",
        namespace: activeNamespace,
        memory_id: res.id || null,
        blob_id: res.blob_id || null,
        latency_ms: latency,
        result_summary: `User confirmed [${candidate.type}]: "${candidate.content.slice(0, 40)}..."`,
        success: true,
        label: process.env.MEMWAL_KEY ? "REAL" : "SIMULATED",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
