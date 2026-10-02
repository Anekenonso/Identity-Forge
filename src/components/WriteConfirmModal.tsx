"use client";

import React from "react";
import type { CandidateMemory } from "@/lib/types";

interface WriteConfirmModalProps {
  candidate: CandidateMemory | null;
  onConfirm: (candidate: CandidateMemory) => void;
  onReject: () => void;
  loading: boolean;
}

export function WriteConfirmModal({
  candidate,
  onConfirm,
  onReject,
  loading,
}: WriteConfirmModalProps) {
  if (!candidate) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "16px",
      }}
    >
      <div
        className="glass-panel animate-slide-up"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "24px",
          border: "1px solid var(--accent-cyan)",
          boxShadow: "0 0 35px rgba(56, 189, 248, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span className="badge badge-cyan" style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
            {candidate.type.toUpperCase()} WRITE PROPOSED
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Confidence: {Math.round(candidate.confidence * 100)}%
          </span>
        </div>

        <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "8px" }}>
          Confirm State Mutation
        </h3>

        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.5" }}>
          The assistant proposes to anchor this {candidate.type} permanently into your Walrus identity store. Code authority requires your explicit confirmation before encrypting and publishing to decentralized storage.
        </p>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            marginBottom: "20px",
            fontSize: "0.9rem",
            color: "var(--text-primary)",
            lineHeight: "1.4",
            fontFamily: "var(--font-mono)",
          }}
        >
          "{candidate.content}"
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onReject}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: "8px 18px" }}
          >
            Discard
          </button>
          <button
            onClick={() => onConfirm(candidate)}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: "8px 20px" }}
          >
            {loading ? "Writing to Walrus..." : "Confirm & Write to Walrus"}
          </button>
        </div>
      </div>
    </div>
  );
}
