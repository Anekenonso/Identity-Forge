"use client";

import React, { useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (text: string) => void;
  loading: boolean;
  activeModel: string;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  onSendMessage,
  loading,
  activeModel,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const presetQueries = [
    { label: "🔍 Who am I?", query: "Who am I, what is my role, and what are my tech preferences?" },
    { label: "💾 Store Pref", query: "I prefer strict static typing with zero mocks in tests." },
    { label: "🎯 Propose Goal", query: "Remember: My goal is shipping the Walrus Session 8 hackathon entry by October 8." },
    { label: "❓ Negative Probe", query: "What is my pet dog's name and favorite treat?" },
    { label: "⚠️ Superseded Trap", query: "What was my previous primary model before DeepSeek?" },
  ];

  return (
    <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Chat Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>Conversational Agent</h2>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Decoupled LLM reasoning over sovereign Walrus state
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Model:</span>
          <span className="badge badge-cyan" style={{ fontSize: "0.75rem", padding: "3px 8px" }}>
            {activeModel}
          </span>
        </div>
      </div>

      {/* Preset Action Buttons */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.2)", display: "flex", gap: "8px", overflowX: "auto" }}>
        {presetQueries.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p.query)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "4px 10px", whiteSpace: "nowrap", borderRadius: "var(--radius-full)" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: "420px", padding: "30px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🛡️</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--text-primary)" }}>Cold-Start Agent Initialized</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              This assistant has zero local database storage. Every turn, it reconstructs its persona, preferences, and episodic memory directly from decentralized Walrus blobs.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "12px" }}>
              Send a message or select a test probe above to begin.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="animate-slide-up"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, rgba(2, 132, 199, 0.4) 0%, rgba(37, 99, 235, 0.4) 100%)"
                    : "var(--bg-card)",
                  border: `1px solid ${msg.role === "user" ? "rgba(56, 189, 248, 0.4)" : "var(--border-subtle)"}`,
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  boxShadow: msg.role === "user" ? "0 4px 14px rgba(2, 132, 199, 0.2)" : "none",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                {/* Cited Memory Badges */}
                {msg.citedIds && msg.citedIds.length > 0 && (
                  <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                      CITED FROM WALRUS:
                    </span>
                    {msg.citedIds.map((id, cIdx) => (
                      <span
                        key={cIdx}
                        className="badge badge-cyan"
                        style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                        title={`Verified Memory Anchor: ${id}`}
                      >
                        [ID: {id.slice(0, 10)}]
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px", padding: "0 4px" }}>
                {msg.role === "user" ? "You" : `IdentityForge (${activeModel})`} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "var(--bg-card)", borderRadius: "var(--radius-md)", width: "fit-content", border: "1px solid var(--border-subtle)" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-cyan)", animation: "pulseGlow 1s infinite" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              Reconstructing from Walrus & synthesizing with DeepSeek...
            </span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "12px", background: "rgba(0, 0, 0, 0.3)" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to your agent, share a preference, or test recall..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontSize: "0.9rem",
            fontFamily: "var(--font-sans)",
            outline: "none",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-cyan)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn btn-primary"
          style={{ padding: "12px 24px" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
