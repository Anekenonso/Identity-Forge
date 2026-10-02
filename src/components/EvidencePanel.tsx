"use client";

import React, { useState } from "react";
import type { EvidenceLogEntry, IdentitySnapshot, RecalledFact } from "@/lib/types";

interface EvidencePanelProps {
  evidence: EvidenceLogEntry[];
  snapshot: IdentitySnapshot | null;
  facts: RecalledFact[];
  isMock: boolean;
  namespace: string;
}

export function EvidencePanel({
  evidence,
  snapshot,
  facts,
  isMock,
  namespace,
}: EvidencePanelProps) {
  const [activeTab, setActiveTab] = useState<"telemetry" | "state">("telemetry");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-cyan)", boxShadow: "0 0 8px var(--accent-cyan)" }} />
            Evidence Telemetry Engine
          </h2>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Decentralized audit trail on Walrus Storage
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`btn ${activeTab === "telemetry" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "4px 12px", fontSize: "0.75rem" }}
          >
            Telemetry ({evidence.length})
          </button>
          <button
            onClick={() => setActiveTab("state")}
            className={`btn ${activeTab === "state" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "4px 12px", fontSize: "0.75rem" }}
          >
            Identity State ({facts.length})
          </button>
        </div>
      </div>

      {/* Snapshot Header Card */}
      <div style={{ padding: "12px 20px", background: "rgba(0, 0, 0, 0.25)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>ACTIVE IDENTITY BACKBONE</span>
          <span className="badge badge-cyan" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
            {snapshot ? `Snapshot v${snapshot.version}` : "Clean Slate (C0)"}
          </span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: "1.4", fontFamily: "var(--font-mono)", background: "rgba(255, 255, 255, 0.02)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
          {snapshot ? (
            <div>
              <div style={{ color: "var(--accent-cyan)", marginBottom: "4px" }}>Anchor ID: {snapshot.id.slice(0, 16)}...</div>
              <div>{snapshot.summary}</div>
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
              No snapshot found. Reconstructing in onboarding mode.
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {activeTab === "telemetry" ? (
          evidence.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No operations logged yet. Send a message to initiate Walrus reconstruction.
            </div>
          ) : (
            evidence.map((entry) => (
              <div
                key={entry.id}
                className="glass-card animate-slide-up"
                style={{ padding: "12px 14px", borderLeft: `3px solid ${entry.success ? "var(--accent-cyan)" : "var(--status-danger)"}` }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: entry.operation === "remember" ? "rgba(16, 185, 129, 0.15)" : entry.operation === "recall" ? "rgba(56, 189, 248, 0.15)" : "rgba(168, 85, 247, 0.15)",
                        color: entry.operation === "remember" ? "var(--status-real)" : entry.operation === "recall" ? "var(--accent-cyan)" : "var(--accent-purple)",
                      }}
                    >
                      {entry.operation}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {entry.latency_ms}ms
                    </span>
                  </div>
                  <span className={`badge ${entry.label === "REAL" ? "badge-real" : "badge-simulated"}`} style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                    {entry.label}
                  </span>
                </div>

                <div style={{ fontSize: "0.825rem", color: "var(--text-primary)", marginBottom: "6px" }}>
                  {entry.result_summary}
                </div>

                {entry.blob_id && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0, 0, 0, 0.3)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
                    <span title={entry.blob_id}>Blob: {entry.blob_id.slice(0, 22)}...</span>
                    <button
                      onClick={() => handleCopy(entry.blob_id!)}
                      style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.7rem" }}
                    >
                      {copiedId === entry.blob_id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          facts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No persistent facts in current namespace.
            </div>
          ) : (
            facts.map((fact) => (
              <div key={fact.id} className="glass-card" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    [ID: {fact.id.slice(0, 12)}]
                  </span>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {fact.type}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.4" }}>
                  {fact.content}
                </div>
                <div style={{ marginTop: "6px", fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Blob: {fact.blobId.slice(0, 16)}... | v{fact.version}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Footer Info */}
      <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-subtle)", background: "rgba(0, 0, 0, 0.4)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        <span>NS: {namespace}</span>
        <span>Storage: {isMock ? "Mock / Local" : "Walrus Mainnet"}</span>
      </div>
    </div>
  );
}
