/**
 * IdentityForge — MemWal Client Provider
 * Instantiates the production MemWal client with delegate key auth,
 * or gracefully provides MemWalMock when credentials are unset.
 */

import { MemWal, MemWalMock } from "@mysten-incubation/memwal";
import { encodeEnvelope } from "./envelope";
import { AGENT_PROFILES } from "./profiles";

let globalMemWalClient: any = null;
let isMockSeeded = false;

export interface ClientStatus {
  isMock: boolean;
  namespace: string;
  serverUrl: string;
  hasCredentials: boolean;
}

function seedMockProfiles(client: any) {
  if (isMockSeeded) return;
  isMockSeeded = true;

  try {
    for (const profile of AGENT_PROFILES) {
      if (!profile.facts || profile.facts.length === 0) continue;

      // Seed snapshot envelope
      if (profile.snapshot) {
        const snapEnv = encodeEnvelope({
          id: profile.snapshot.id,
          type: "snapshot",
          version: profile.snapshot.version,
          content: profile.snapshot.summary,
        });
        client.remember(snapEnv, profile.namespace).catch(() => {});
      }

      // Seed individual 5D fact envelopes
      for (const fact of profile.facts) {
        const factEnv = encodeEnvelope({
          id: fact.id,
          type: fact.type,
          version: fact.version,
          supersedes: fact.supersedes,
          content: fact.content,
        });
        client.remember(factEnv, profile.namespace).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Notice: Unable to pre-seed mock profiles:", err);
  }
}

export function getMemWalClient(customNamespace?: string) {
  const namespace = customNamespace || process.env.MEMWAL_NAMESPACE || "identity";
  const hasCredentials = Boolean(process.env.MEMWAL_KEY && process.env.MEMWAL_ACCOUNT_ID);

  if (hasCredentials) {
    return MemWal.create({
      key: process.env.MEMWAL_KEY!,
      accountId: process.env.MEMWAL_ACCOUNT_ID!,
      serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz",
      namespace,
    });
  }

  // Reuse singleton mock in local/demo environment so memories persist across turns
  if (!globalMemWalClient) {
    globalMemWalClient = MemWalMock.create({ namespace, owner: "identity-forge-local" });
    seedMockProfiles(globalMemWalClient);
  }
  return globalMemWalClient;
}

export function getClientStatus(customNamespace?: string): ClientStatus {
  const namespace = customNamespace || process.env.MEMWAL_NAMESPACE || "identity";
  const hasCredentials = Boolean(process.env.MEMWAL_KEY && process.env.MEMWAL_ACCOUNT_ID);

  return {
    isMock: !hasCredentials,
    namespace,
    serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz",
    hasCredentials,
  };
}
