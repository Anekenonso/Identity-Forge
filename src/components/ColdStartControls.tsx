"use client";

import React, { useState, useRef, useEffect } from "react";

interface ColdStartControlsProps {
  onWipeLocal: () => Promise<void>;
  onForgetIdentity: () => Promise<void>;
  onConsolidate: () => Promise<void>;
  loading: boolean;
}

export function ColdStartControls({
  onWipeLocal,
  onForgetIdentity,
  onConsolidate,
  loading,
}: ColdStartControlsProps) {
  const [showForgetModal, setShowForgetModal] = useState(false);
  const forgetDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = forgetDialogRef.current;
    if (!dialog) return;
    if (showForgetModal) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [showForgetModal]);

  const handleDialogBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = forgetDialogRef.current;
    if (!dialog || e.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInside =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInside && !loading) {
      setShowForgetModal(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          onClick={onWipeLocal}
          disabled={loading}
          className="btn-studio btn-studio-secondary"
          title="Drops in-memory session cache; forces 100% cold reconstruction from Walrus blobs on the next prompt."
        >
          <span>❄️</span>
          <span>Cold Reboot</span>
        </button>

        <button
          type="button"
          onClick={onConsolidate}
          disabled={loading}
          className="btn-studio btn-studio-secondary"
          title="Synthesizes episodic memory facts into a new versioned Snapshot (v+1) on Walrus."
        >
          <span>📦</span>
          <span>Consolidate</span>
        </button>

        <button
          type="button"
          onClick={() => setShowForgetModal(true)}
          disabled={loading}
          className="btn-studio btn-studio-danger"
          title="Retires the memory namespace generation to enforce 0% residual recall access (H3 Removal Test)."
        >
          <span>💣</span>
          <span>Retire NS</span>
        </button>
      </div>

      {/* Safety Confirmation Dialog for Namespace Retirement */}
      <dialog
        ref={forgetDialogRef}
        onClick={handleDialogBackdropClick}
        onCancel={(e) => {
          e.preventDefault();
          if (!loading) setShowForgetModal(false);
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-rose)" }}>
                Retire Namespace Generation?
              </h3>
              <p style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                Cryptographic memory forget operation (H3 Removal Test)
              </p>
            </div>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            Because Walrus storage blobs are prepaid and immutable across storage epochs, IdentityForge implements
            <strong> Namespace-Generation Retirement</strong>. This retires the current generation namespace and advances to a new clean slate,
            guaranteeing <strong>0.0% residual memory leakage</strong>.
          </p>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={() => setShowForgetModal(false)}
              disabled={loading}
              className="btn-studio btn-studio-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await onForgetIdentity();
                setShowForgetModal(false);
              }}
              disabled={loading}
              className="btn-studio btn-studio-danger"
            >
              {loading ? "Retiring Namespace..." : "Confirm & Retire Namespace"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
