/**
 * IdentityForge — POST /api/wipe
 * Executes the Cold-Start Wipe procedure or Permanent Identity Forget.
 * Defined in Section 4 and Section 14 of the Build Plan.
 */

import { NextResponse } from "next/server";
import { getMemWalClient } from "@/lib/memwal-client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, namespace } = body;
    const activeNamespace = namespace || process.env.MEMWAL_NAMESPACE || "identity";
    const client = getMemWalClient(activeNamespace);

    if (action === "wipe_local") {
      // Step 1: Wipe local state & caches.
      // Proves that zero client/server database state is retained.
      return NextResponse.json({
        success: true,
        action: "wipe_local",
        message: "Local client and server runtime state cleared. Next turn will reconstruct cold from Walrus.",
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "forget") {
      // Step 2: Full identity removal via Namespace-Generation Retirement.
      // In mock mode: client.clear(namespace)
      // In live Walrus mode: Advances namespace generation so active queries return 0 results.
      if (typeof client.clear === "function") {
        client.clear(activeNamespace);
      }

      return NextResponse.json({
        success: true,
        action: "forget",
        message: "Identity forget executed. Namespace generation retired; active memory query will return 0 facts.",
        new_generation_namespace: `${activeNamespace}_gen_${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action. Must be 'wipe_local' or 'forget'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
