/**
 * IdentityForge — MemWal Client Provider
 * Instantiates the production MemWal client with delegate key auth,
 * or gracefully provides MemWalMock when credentials are unset.
 */

import { MemWal, MemWalMock } from "@mysten-incubation/memwal";

let globalMemWalClient: any = null;

export interface ClientStatus {
  isMock: boolean;
  namespace: string;
  serverUrl: string;
  hasCredentials: boolean;
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
