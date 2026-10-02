/**
 * IdentityForge — GET /api/health
 * Returns status of Walrus Memory client, active namespace, and relayer connection.
 */

import { NextResponse } from "next/server";
import { getClientStatus, getMemWalClient } from "@/lib/memwal-client";

export async function GET() {
  const status = getClientStatus();
  let relayerHealth: any = null;

  try {
    const client = getMemWalClient();
    relayerHealth = await client.health();
  } catch (err: any) {
    relayerHealth = { status: "offline", error: err.message };
  }

  return NextResponse.json({
    app: "IdentityForge",
    version: "2.0.0",
    walrus_session: "Session 8: Chatbots That Remember",
    status,
    relayer: relayerHealth,
    primary_model: process.env.PRIMARY_MODEL_ID || "deepseek-chat",
    timestamp: new Date().toISOString(),
  });
}
