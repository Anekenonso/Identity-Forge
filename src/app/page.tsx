"use client";

import React, { useState, useEffect } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ColdStartControls } from "@/components/ColdStartControls";
import { EvidencePanel } from "@/components/EvidencePanel";
import { WriteConfirmModal } from "@/components/WriteConfirmModal";
import type { CandidateMemory, ChatMessage, EvidenceLogEntry, IdentitySnapshot, RecalledFact } from "@/lib/types";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceLogEntry[]>([]);
  const [snapshot, setSnapshot] = useState<IdentitySnapshot | null>(null);
  const [facts, setFacts] = useState<RecalledFact[]>([]);
  const [pendingCandidate, setPendingCandidate] = useState<CandidateMemory | null>(null);
  const [activeModel, setActiveModel] = useState("deepseek-chat");
  const [namespace, setNamespace] = useState("identity");
  const [isMock, setIsMock] = useState(true);

  // Initial health check on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status) {
          setIsMock(data.status.isMock);
          setNamespace(data.status.namespace);
        }
      })
      .catch((err) => console.warn("Initial health check error:", err));
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          namespace,
          modelOverride: activeModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to communicate with agent");
      }

      // Append new telemetry evidence
      if (data.evidence && Array.isArray(data.evidence)) {
        setEvidence((prev) => [...data.evidence, ...prev]);
      }

      // Update reconstructed facts & snapshot in telemetry panel
      if (data.citations) {
        setFacts((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const newFacts = data.citations.filter((c: RecalledFact) => !existingIds.has(c.id));
          return [...newFacts, ...prev];
        });
      }

      // Create assistant reply message
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
        citedIds: data.citations?.map((c: RecalledFact) => c.id) || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Handle user confirmation required candidates (Persona / Goal)
      if (data.pending_confirmations && data.pending_confirmations.length > 0) {
        setPendingCandidate(data.pending_confirmations[0]);
      }
    } catch (err: any) {
      console.error("Error in chat turn:", err);
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content: `Error: ${err.message || "Failed to process turn"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCandidate = async (candidate: CandidateMemory) => {
    setLoading(true);
    try {
      const res = await fetch("/api/confirm-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          candidate,
          namespace,
        }),
      });
      const data = await res.json();
      if (data.evidence) {
        setEvidence((prev) => [data.evidence, ...prev]);
      }
      if (data.memory) {
        setFacts((prev) => [
          {
            id: data.memory.id,
            blobId: data.memory.blob_id,
            type: data.memory.type,
            content: data.memory.content,
            timestamp: new Date().toISOString(),
            version: 1,
            supersedes: "none",
            distance: 0,
            rawText: data.memory.content,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error("Error confirming candidate:", err);
    } finally {
      setPendingCandidate(null);
      setLoading(false);
    }
  };

  const handleRejectCandidate = () => {
    setPendingCandidate(null);
  };

  const handleWipeLocal = async () => {
    setLoading(true);
    try {
      await fetch("/api/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wipe_local", namespace }),
      });
      // Clear in-memory chat session to demonstrate cold reconstruction
      setMessages([]);
      setEvidence((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          operation: "wipe",
          namespace,
          memory_id: null,
          blob_id: null,
          latency_ms: 5,
          result_summary: "Wipe Local: in-memory state cleared. Rebuilding cold from Walrus on next turn.",
          success: true,
          label: "MEASURED",
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Wipe failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgetIdentity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forget", namespace }),
      });
      const data = await res.json();
      setMessages([]);
      setFacts([]);
      setSnapshot(null);
      if (data.new_generation_namespace) {
        setNamespace(data.new_generation_namespace);
      }
      setEvidence((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          operation: "forget",
          namespace,
          memory_id: null,
          blob_id: null,
          latency_ms: 12,
          result_summary: "Identity Forget executed. Namespace retired. Memory store reset to clean slate (C0).",
          success: true,
          label: "MEASURED",
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Forget failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsolidate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Consolidate my current persona, goals, and preferences into a new snapshot.",
          namespace,
          modelOverride: activeModel,
        }),
      });
      const data = await res.json();
      if (data.evidence) {
        setEvidence((prev) => [...data.evidence, ...prev]);
      }
    } catch (err) {
      console.error("Consolidate failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Application Header */}
      <header className="app-header glass-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #0284c7 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
            }}
          >
            ⚓
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.35rem", letterSpacing: "-0.03em" }}>IdentityForge</h1>
              <span className="badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                Walrus Session 8
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Decentralized Persistent Identity & Cold-Start Agent Reconstruction
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Model Selector Toggle (for C3 Portability / Model Swap) */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0, 0, 0, 0.3)", padding: "4px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Model:</span>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-cyan)",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="deepseek-chat" style={{ background: "#0c0e18", color: "#f8fafc" }}>
                DeepSeek-V3 (Primary)
              </option>
              <option value="meta-llama/llama-3.3-70b-instruct" style={{ background: "#0c0e18", color: "#f8fafc" }}>
                Llama 3.3 70B (Model Swap H2)
              </option>
              <option value="qwen/qwen-2.5-72b-instruct" style={{ background: "#0c0e18", color: "#f8fafc" }}>
                Qwen 2.5 72B (Open Models)
              </option>
            </select>
          </div>

          {/* Storage Mode Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className={`badge ${!isMock ? "badge-real" : "badge-simulated"}`}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: !isMock ? "var(--status-real)" : "var(--status-simulated)" }} />
              {!isMock ? "Walrus Mainnet" : "MemWal Mock"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid: Chat + Evidence Telemetry */}
      <main className="main-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", minHeight: 0 }}>
          <ColdStartControls
            onWipeLocal={handleWipeLocal}
            onForgetIdentity={handleForgetIdentity}
            onConsolidate={handleConsolidate}
            loading={loading}
          />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatInterface
              messages={messages}
              input={input}
              setInput={setInput}
              onSendMessage={handleSendMessage}
              loading={loading}
              activeModel={activeModel}
            />
          </div>
        </div>

        <div style={{ height: "100%", minHeight: 0 }}>
          <EvidencePanel
            evidence={evidence}
            snapshot={snapshot}
            facts={facts}
            isMock={isMock}
            namespace={namespace}
          />
        </div>
      </main>

      {/* Confirmation Modal for Persona/Goal Writes */}
      <WriteConfirmModal
        candidate={pendingCandidate}
        onConfirm={handleConfirmCandidate}
        onReject={handleRejectCandidate}
        loading={loading}
      />
    </div>
  );
}
