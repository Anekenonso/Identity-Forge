"use client";

import React, { useRef, useEffect } from "react";
import type { CandidateMemory, ChatMessage } from "@/lib/types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (text: string) => void;
  loading: boolean;
  activeModel: string;
  namespace: string;
  probes?: { label: string; query: string }[];
  pendingCandidate?: CandidateMemory | null;
  onConfirmCandidate?: (candidate: CandidateMemory) => void;
  onRejectCandidate?: () => void;
  onSelectCitation?: (factId: string) => void;
  onClearMessages?: () => void;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  onSendMessage,
  loading,
  activeModel,
  namespace,
  probes = [],
  pendingCandidate,
  onConfirmCandidate,
  onRejectCandidate,
  onSelectCitation,
  onClearMessages,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, pendingCandidate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || loading) return;
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const getModelLabel = (model: string) => {
    if (model.includes("llama")) return "Llama 3.3 70B";
    if (model.includes("qwen")) return "Qwen 2.5 72B";
    return "DeepSeek-V3";
  };

  return (
    <div className="fauzec-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="fauzec-card-header">
        <div>
          <div className="fauzec-card-title">
            <span>💬</span>
            <span>Interactive Chatbot</span>
          </div>
          <p className="fauzec-card-subtitle">
            Zero-state node · Reconstructs state cold every turn from Walrus Protocol
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="fauzec-pill fauzec-pill-muted">
            ns: {namespace}
          </span>
          <span className="fauzec-pill fauzec-pill-amber">
            {getModelLabel(activeModel)}
          </span>
        </div>
      </div>

      {/* Quick Prompt Probes (3-4 obvious questions) */}
      {probes.length > 0 && (
        <div className="quick-probes-bar">
          <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginRight: "4px" }}>
            Quick Prompts:
          </span>
          {probes.map((probe, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(probe.query)}
              disabled={loading}
              className="probe-chip-btn"
              title={probe.query}
            >
              {probe.label}
            </button>
          ))}
        </div>
      )}

      {/* Message Feed Stream */}
      <div ref={scrollRef} className="chat-stream-box">
        {messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: "420px", padding: "40px 16px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🤖</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
              Ready for Turn
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
              Send a message or click a quick prompt above. This agent will query decentralized Walrus blobs to reconstruct its memory cold.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const isSystem = msg.role === "system";

            if (isSystem) {
              return (
                <div key={msg.id} style={{ padding: "8px 12px", background: "rgba(244,63,94,0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(244,63,94,0.3)", color: "#fca5a5", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                  {msg.content}
                </div>
              );
            }

            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", padding: "0 6px", alignSelf: isUser ? "flex-end" : "flex-start" }}>
                  {isUser ? "YOU" : `AGENT · ${getModelLabel(activeModel)}`}
                </div>

                <div className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-agent"}`}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                  {/* Clickable Citations */}
                  {msg.citedIds && msg.citedIds.length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        WALRUS ANCHORS:
                      </span>
                      {msg.citedIds.map((cid, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className="citation-tag"
                          onClick={() => onSelectCitation && onSelectCitation(cid)}
                          title="Click to view memory blob in vault"
                        >
                          <span>⚓</span> {cid}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", maxWidth: "340px" }}>
            <span className="status-dot" style={{ color: "var(--brand-amber)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Reconstructing from Walrus blobs...
            </span>
          </div>
        )}

        {/* Inline Candidate Proposal */}
        {pendingCandidate && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "rgba(245,158,11,0.08)", border: "1px solid var(--brand-amber-border)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--brand-amber-light)", fontWeight: 700 }}>
              <span>⚡ PROPOSED WALRUS WRITE · {pendingCandidate.type.toUpperCase()}</span>
              <span style={{ color: "var(--text-muted)" }}>Confidence: {(pendingCandidate.confidence * 100).toFixed(0)}%</span>
            </div>
            <div style={{ fontSize: "0.84rem", color: "#fff" }}>
              &quot;{pendingCandidate.content}&quot;
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => onConfirmCandidate && onConfirmCandidate(pendingCandidate)}
                disabled={loading}
                className="fauzec-btn fauzec-btn-primary"
                style={{ padding: "5px 12px", fontSize: "0.74rem" }}
              >
                ✓ Sign & Commit to Walrus
              </button>
              <button
                type="button"
                onClick={() => onRejectCandidate && onRejectCandidate()}
                disabled={loading}
                className="fauzec-btn fauzec-btn-secondary"
                style={{ padding: "5px 12px", fontSize: "0.74rem" }}
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="chat-input-area">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or tell the agent something to remember..."
          rows={1}
          disabled={loading}
          className="chat-textarea"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="fauzec-btn fauzec-btn-primary"
          style={{ height: "42px", padding: "0 18px", flexShrink: 0 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
