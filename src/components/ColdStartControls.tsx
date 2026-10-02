"use client";

import React, { useState } from "react";

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
  const [showForgetConfirm, setShowForgetConfirm] = useState(false);

  return (
    <div className="glass-card" style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Identity Controls:
        </span>
        <button
          onClick={onWipeLocal}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", fontSize: "0.75rem" }}
          title="Clears in-memory session. Rebuilds agent state cold from Walrus on next turn."
        >
          ❄️ Wipe Local & Reconstruct
        </button>
        <button
          onClick={onConsolidate}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", fontSize: "0.75rem" }}
          title="Consolidates recent episodic facts into a new snapshot version (v+1)."
        >
          ⚡ Consolidate Snapshot
        </button>
      </div>

      <div>
        {!showForgetConfirm ? (
          <button
            onClick={() => setShowForgetConfirm(true)}
            disabled={loading}
            className="btn btn-danger"
            style={{ padding: "6px 14px", fontSize: "0.75rem" }}
            title="Permanently severs access to stored identity (Condition C4 Removal Test)."
          >
            🗑️ Forget Identity
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--status-danger)", fontWeight: 600 }}>Confirm Forget?</span>
            <button
              onClick={async () => {
                await onForgetIdentity();
                setShowForgetConfirm(false);
              }}
              disabled={loading}
              className="btn btn-danger"
              style={{ padding: "4px 10px", fontSize: "0.7rem" }}
            >
              Yes, Forget
            </button>
            <button
              onClick={() => setShowForgetConfirm(false)}
              className="btn btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.7rem" }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
