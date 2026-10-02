"use client";

import React, { useRef, useEffect } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (candidate) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [candidate]);

  // Handle light dismiss click on backdrop per modern-web-guidance
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInsideContent =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInsideContent && !loading) {
      onReject();
    }
  };

  if (!candidate) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onReject();
      }}
      aria-labelledby="dialog-candidate-title"
      style={{
        margin: "auto",
        border: "none",
        background: "transparent",
        padding: "16px",
        outline: "none",
        maxWidth: "560px",
        width: "92vw",
      }}
    >
      <div
        className="fauzec-card animate-slide-up"
        style={{
          padding: "28px",
          border: "1px solid var(--brand-amber-border)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(245, 158, 11, 0.2)",
          background: "#141418",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pill-badge pill-amber">
              {candidate.type.toUpperCase()} WRITE PROPOSED
            </span>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              Confidence: {Math.round(candidate.confidence * 100)}%
            </span>
          </div>
          <button
            type="button"
            onClick={onReject}
            disabled={loading}
            aria-label="Close dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.1rem",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        <h3 id="dialog-candidate-title" style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "8px" }}>
          Confirm State Mutation
        </h3>

        <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "18px" }}>
          The assistant proposes to establish this <strong>{candidate.type}</strong> into your persistent Walrus identity store. Under our deterministic authority rules, foundational changes require explicit confirmation.
        </p>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
            marginBottom: "24px",
            fontSize: "0.92rem",
            color: "var(--text-primary)",
            lineHeight: "1.5",
            fontFamily: "var(--font-mono)",
            borderLeft: "3px solid var(--brand-amber)",
          }}
        >
          &quot;{candidate.content}&quot;
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            onClick={onReject}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: "9px 20px" }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onConfirm(candidate)}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: "9px 22px" }}
          >
            {loading ? "Writing to Walrus..." : "✓ Commit to Walrus"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
