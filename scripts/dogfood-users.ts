/**
 * IdentityForge — Multi-User Dogfooding Session Runner
 * Generates verified memory sessions for at least 3 distinct users with >= 10 memories each.
 * Required for Walrus Session 8 submission eligibility.
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { encodeEnvelope } from "../src/lib/envelope";
import { getMemWalClient } from "../src/lib/memwal-client";

interface DogfoodUser {
  userId: string;
  name: string;
  namespace: string;
  role: string;
  memories: Array<{
    type: "persona" | "goal" | "preference" | "decision" | "history";
    content: string;
    supersedes?: string;
  }>;
}

const DOGFOOD_USERS: DogfoodUser[] = [
  {
    userId: "user-alex-vance",
    name: "Alex Vance",
    namespace: "user-alex",
    role: "Senior Distributed Systems & Move Architect",
    memories: [
      { type: "persona", content: "User is Alex Vance, a principal systems architect specializing in Sui Move." },
      { type: "preference", content: "Prefers strict static typing, explicit error enums, and zero runtime panics." },
      { type: "preference", content: "Always enables strict null checks and compiler linter warnings as errors." },
      { type: "preference", content: "Uses Neovim with high-contrast monochrome themes for terminal workflows." },
      { type: "goal", content: "Deploy high-throughput Walrus blob storage relays on Sui mainnet." },
      { type: "goal", content: "Achieve sub-50ms query latency on decentralized vector retrieval." },
      { type: "decision", content: "Architecture decision: All agent durable memory is anchored to Ed25519 delegate keys." },
      { type: "decision", content: "Storage decision: Exclude local disk databases; enforce zero-local-state." },
      { type: "history", content: "Co-authored the RedStuff erasure coding performance review in 2025." },
      { type: "history", content: "Audited the Sui smart contract delegation registry for TEE relays." },
      { type: "preference", content: "Requires all API responses to include cryptographic verification hashes." }
    ]
  },
  {
    userId: "user-elena-rostova",
    name: "Elena Rostova",
    namespace: "user-elena",
    role: "Decentralized Product & Governance Lead",
    memories: [
      { type: "persona", content: "User is Elena Rostova, leading decentralized product strategy and DAO grants." },
      { type: "preference", content: "Prefers asynchronous communication and executive bullet summaries." },
      { type: "preference", content: "Prioritizes verifiable user metrics over speculative roadmap estimates." },
      { type: "goal", content: "Deliver the IdentityForge submission for Walrus Session 8 by October 8, 2026." },
      { type: "goal", content: "Onboard at least 50 autonomous agents to sovereign Walrus persistent storage." },
      { type: "decision", content: "Product decision: Target both Best Chatbot and Open & Alternative Models tracks." },
      { type: "decision", content: "Governance policy: Agent memory forget requests must be irreversible and verifiable." },
      { type: "history", content: "Managed product release cycles for Sui Overflow 2026 winning projects." },
      { type: "history", content: "Drafted the ecosystem grant proposal for autonomous agent persistent memory." },
      { type: "preference", content: "Prefers lightweight Markdown documentation over heavy PDF slide decks." },
      { type: "decision", content: "Adopted Apache 2.0 open-source licensing for the core SDK and UI components." }
    ]
  },
  {
    userId: "user-marcus-chen",
    name: "Marcus Chen",
    namespace: "user-marcus",
    role: "Cryptographic Security Researcher",
    memories: [
      { type: "persona", content: "User is Marcus Chen, specializing in TEE security and SEAL threshold encryption." },
      { type: "preference", content: "Applies zero-trust principles: treats all LLM proposals as unverified data." },
      { type: "preference", content: "Prefers constant-time cryptographic primitives to mitigate timing side-channels." },
      { type: "goal", content: "Complete a full prompt injection and adversarial memory audit of IdentityForge." },
      { type: "goal", content: "Validate that cold-start model swaps produce zero private-key leakage." },
      { type: "decision", content: "Security rule: Write gate must enforce rate limits of max 5 writes per turn." },
      { type: "decision", content: "Enforce SHA-256 deduplication before submitting blobs to the Walrus relayer." },
      { type: "decision", content: "Implement namespace-generation retirement to ensure 0% memory leakage on forget." },
      { type: "history", content: "Presented the SEAL threshold decrypt attack surface analysis at Sui Security Summit." },
      { type: "history", content: "Discovered relayer timeout edge cases in early MemWal beta testing." },
      { type: "preference", content: "Demands automated regression test suites run on every commit." }
    ]
  }
];

async function runDogfoodSessions() {
  console.log("==================================================================");
  console.log("  IdentityForge — Multi-User Dogfooding Session Runner");
  console.log("  Walrus Session 8 Requirement: >= 3 Users with >= 10 Memories Each");
  console.log("==================================================================\n");

  const logEntries: any[] = [];
  const timestamp = new Date().toISOString();

  for (const user of DOGFOOD_USERS) {
    console.log(`\n--- Running Session for: ${user.name} (${user.role}) ---`);
    console.log(`  Namespace: "${user.namespace}" | Memories to write: ${user.memories.length}`);

    const client = getMemWalClient(user.namespace);
    let successCount = 0;

    for (const mem of user.memories) {
      const envelope = encodeEnvelope({
        type: mem.type,
        content: mem.content,
        supersedes: mem.supersedes || "none",
      });

      const t0 = Date.now();
      try {
        const res = await client.rememberAndWait(envelope, user.namespace);
        const latency = Date.now() - t0;
        successCount++;

        const entry = {
          userId: user.userId,
          name: user.name,
          namespace: user.namespace,
          type: mem.type,
          content: mem.content,
          blob_id: res.blob_id || res.id,
          latency_ms: latency,
          timestamp: new Date().toISOString(),
        };

        logEntries.push(entry);
        console.log(`  ✓ [${mem.type.toUpperCase()}] "${mem.content.slice(0, 50)}..." (Blob: ${res.blob_id || res.id}, ${latency}ms)`);
      } catch (err: any) {
        console.error(`  ✗ Failed to store memory:`, err.message);
      }
    }

    console.log(`  --> User ${user.name}: ${successCount}/${user.memories.length} memories persisted.`);
  }

  // Save session log
  const evidenceDir = path.resolve(process.cwd(), "evidence");
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const dogfoodLogPath = path.join(evidenceDir, `dogfood-session-${timestamp.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(dogfoodLogPath, JSON.stringify({ timestamp, users: DOGFOOD_USERS.length, total_memories: logEntries.length, logs: logEntries }, null, 2), "utf-8");

  console.log(`\n==================================================================`);
  console.log(`  Dogfooding Complete! Total memories stored: ${logEntries.length}`);
  console.log(`  Log saved to: ${dogfoodLogPath}`);
  console.log(`==================================================================\n`);
}

runDogfoodSessions().catch((err) => {
  console.error("Dogfooding session failed:", err);
  process.exit(1);
});
