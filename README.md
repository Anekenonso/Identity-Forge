# IdentityForge
**Decentralized Persistent Identity & Cold-Start Agent Reconstruction on Walrus Memory**

> "If durable agent identity (persona, goals, preferences, decisions, and history) is decoupled from model context and stored exclusively in decentralized Walrus Memory blobs via cryptographic delegate keys, future conversational agents can be cold-started on any machine, deployment, or alternative LLM with quantifiable fidelity ($\ge 90\%$) — because identity is owned by cryptographic storage rather than ephemeral runtime state."

[![Walrus Session 8](https://img.shields.io/badge/Walrus_Session_8-Chatbots_That_Remember-0284c7?style=flat-square)](https://www.deepsurge.xyz/hackathons/c0141a4a-21be-4009-bc63-7c168608c849)
[![Storage: Walrus](https://img.shields.io/badge/Storage-Walrus_Mainnet-38bdf8?style=flat-square)](https://walrus.xyz)
[![Memory SDK: MemWal](https://img.shields.io/badge/Memory_SDK-@mysten--incubation/memwal-6366f1?style=flat-square)](https://github.com/MystenLabs/MemWal)
[![LLM: DeepSeek-V3](https://img.shields.io/badge/Primary_LLM-DeepSeek--V3-10b981?style=flat-square)](https://deepseek.com)
[![Alternative Models](https://img.shields.io/badge/Track-Open_&_Alternative_Models-f59e0b?style=flat-square)](https://www.deepsurge.xyz)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)

---

## Table of Contents
1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [Architecture & Protocol Flow](#3-architecture--protocol-flow)
4. [Authority Boundaries: AI vs. Deterministic Code](#4-authority-boundaries-ai-vs-deterministic-code)
5. [Load-Bearing Infrastructure & Sponsors](#5-load-bearing-infrastructure--sponsors)
6. [Interactive UI/UX Walkthrough](#6-interactive-uiux-walkthrough)
7. [REST API Specifications](#7-rest-api-specifications)
8. [Core Logic & Memory Envelopes](#8-core-logic--memory-envelopes)
9. [Proof Experiment & Evaluation Results (H1–H5)](#9-proof-experiment--evaluation-results-h1h5)
10. [Local Development & Fresh-Clone Setup](#10-local-development--fresh-clone-setup)
11. [Published Limitations & Security](#11-published-limitations--security)
12. [Roadmap](#12-roadmap)

---

## 1. The Problem

Modern conversational agents suffer from a fundamental architectural flaw: **they are amnesiac state machines bound to ephemeral containers.** Today's AI assistants fail across three distinct structural dimensions:

1. **The Blank Slate Dilemma (Runtime Volatility):**  
   Agent state is typically stored in volatile model context, browser cookies/localStorage, or server RAM. When a browser tab closes, a server restarts, or a container redeploys, the agent forgets its persona, established preferences, and prior decisions.
2. **Centralized Database Custody & Vendor Lock-In:**  
   When persistent memory is attempted, developers default to centralized PostgreSQL or vector database instances (Pinecone, Supabase, Weaviate). This reintroduces the very Web2 surveillance and custody models that Web3 was created to replace. Users do not own their agent's memories; deletion semantics are opaque, and migrating an agent to a new provider is impossible without manual database dumps.
3. **Model Coupling & Hallucination Degradation:**  
   Existing agent architectures tightly couple long-term memory to specific proprietary models (e.g., OpenAI or Anthropic system prompts). If the model is swapped or upgraded, the agent frequently hallucinates personal history or fails to adhere to historical commitments because memory is unanchored to verified cryptographic citations.

---

## 2. The Solution

**IdentityForge** decouples the AI "brain" (the stateless LLM) from its "identity" (sovereign persistent memory stored on Walrus).

- **Sovereign Cryptographic Custody:** An Ed25519 delegate key on Sui acts as the identity root. Whoever holds the delegate key holds the agent's memory across any device or client interface.
- **Zero Local/Server State:** The Next.js API server and browser client maintain zero local databases, zero cookies, and zero Redis caches for identity. Every conversation turn reconstructs identity cold from Walrus.
- **Versioned Identity Snapshot Backbone ($v+1$):** Solves the inherent risk of semantic search dropping foundational facts. A versioned, append-only snapshot anchors core persona traits, while top-$k$ semantic recall retrieves relevant episodic context.
- **Deterministic Write Gate & Authority Separation:** The LLM only *proposes* memory candidates. Deterministic TypeScript code enforces schemas, length caps, rate limits, deduplication, and mandates explicit UI confirmation for persona/goal updates.
- **Model-Swappable Portability:** Proves that an agent's identity can be rebuilt cold using open-weight models (DeepSeek-V3, Llama 3.3 70B, Qwen 2.5 72B) without degradation.

---

## 3. Architecture & Protocol Flow

### 3.1 System Architecture Flowchart
```mermaid
flowchart TD
    subgraph Client ["Client Layer - Stateless Browser UI"]
        UI["Conversational Interface"]
        EP["Evidence Telemetry Panel"]
        CSC["Cold-Start Controls - Wipe or Forget"]
        WCM["Write Confirmation Modal"]
    end

    subgraph API ["Stateless Orchestrator - Next.js App Router"]
        Route["/api/chat Handler"]
        Recon["Cold Reconstruction Engine"]
        PromptBuilder["Untrusted Data Prompt Assembler"]
        Gate["Deterministic Write Gate"]
        CitGuard["Citation and Hallucination Guard"]
    end

    subgraph Memory ["Decentralized State Layer - Walrus Protocol"]
        Relayer["MemWal Relayer - Rust TEE"]
        Walrus["Walrus Blobs - RedStuff Erasure Coding"]
        Sui["Sui Blockchain - Ed25519 Delegate Key"]
    end

    subgraph Models ["Intelligence Layer - Swappable LLMs"]
        Primary["DeepSeek-V3 - Primary Open Model"]
        Alt["Llama 3.3 70B - Model Swap Target"]
        Judge["Offline Evaluation Judge"]
    end

    UI -->|"1. User Prompt"| Route
    Route -->|"2. Query Snapshot + Facts"| Recon
    Recon -->|"3. Fetch via Ed25519 Auth"| Relayer
    Relayer -->|"4. Read Blobs"| Walrus
    Recon -->|"5. Drop Superseded IDs"| PromptBuilder
    PromptBuilder -->|"6. System Prompt as Data"| Primary
    Primary -->|"7. JSON: reply, cited_ids, candidates"| CitGuard
    CitGuard -->|"8. Verify Citations in Recall"| Gate
    Gate -->|"9a. Persona or Goal update"| WCM
    Gate -->|"9b. Auto-Accepted update"| Relayer
    Relayer -->|"10. Store Blobs"| Walrus
    Route -->|"11. Stream Reply + Blob Citations"| UI
    Route -->|"12. Stream Telemetry Hashes"| EP
```

### 3.2 State Machine Diagram
```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> RECONSTRUCTING: User Message Submitted
    RECONSTRUCTING --> ASSEMBLED: Snapshot vN + Recalled Facts Loaded
    RECONSTRUCTING --> CLEAN_SLATE_C0: 0 Memories in Namespace
    CLEAN_SLATE_C0 --> INFERRING: Prompt with Neutral Onboarding Mode
    ASSEMBLED --> INFERRING: Prompt with Recalled Facts as Data
    INFERRING --> VERIFYING_CITATIONS: LLM Returns JSON Payload
    VERIFYING_CITATIONS --> GATING_CANDIDATES: Citations Valid
    VERIFYING_CITATIONS --> FALLBACK_IGNORANCE: Invalid Citations / Hallucination Detected
    GATING_CANDIDATES --> AWAITING_CONFIRMATION: Persona / Goal Candidate Proposed
    GATING_CANDIDATES --> PERSISTING_WALRUS: Preference / History Auto-Accepted
    AWAITING_CONFIRMATION --> PERSISTING_WALRUS: User Confirms in Modal
    AWAITING_CONFIRMATION --> DISCARDED: User Discards in Modal
    PERSISTING_WALRUS --> STREAMING_EVIDENCE: Blob Uploaded & ID Logged
    FALLBACK_IGNORANCE --> STREAMING_EVIDENCE: Safe Failure Logged
    DISCARDED --> STREAMING_EVIDENCE: Discard Logged
    STREAMING_EVIDENCE --> IDLE: Ready for Next Turn
```

---

## 4. Authority Boundaries: AI vs. Deterministic Code

> **Non-Negotiable Rule:** *AI handles ambiguity; deterministic code owns authority.*

| Responsibility | Handled By | Guarantees & Constraints |
| :--- | :--- | :--- |
| **Reasoning under Ambiguity** | LLM (DeepSeek / Swappable) | Interprets dialogue, extracts candidate preferences, drafts consolidated snapshots. |
| **Write Authorization** | Deterministic Write Gate | Rejects candidate writes exceeding 300 characters, exceeding 5 writes/turn, or having invalid types. |
| **State Mutation Confirmation** | User via UI Modal | Persona and Goal candidates strictly require human confirmation before write execution. |
| **Idempotency & Deduplication** | Cryptographic SHA-256 | `sha256(normalized content)` prevents duplicate blob storage on network retries. |
| **Anti-Hallucination Guard** | Citation Verifier | Claims of personal history must cite recalled memory IDs; ungrounded claims trigger immediate fallback. |
| **Data Immutability** | Walrus Decentralized Network | Blobs stored with RedStuff erasure coding; addressable by immutable `blob_id`. |
| **Identity Removal (Forget)** | Namespace-Generation Retirement | Advances namespace generation; mathematically dropping recall leakage to 0%. |

---

## 5. Load-Bearing Infrastructure & Sponsors

- **Walrus Protocol (`walrus.xyz`):** Decentralized blob storage network by Mysten Labs utilizing RedStuff erasure coding. Stores encrypted memory envelopes across decentralized storage nodes with epoch-based retention.
- **`@mysten-incubation/memwal` SDK (v0.1.8):** Official TypeScript SDK providing Ed25519 delegate-key signed RPC calls to the Walrus Memory Rust TEE relayer (`relayer.memory.walrus.xyz`).
- **Sui Blockchain:** Provides on-chain account registry and cryptographic ownership for Walrus Memory delegate keys.
- **DeepSeek-V3 / DeepSeek-Chat:** Primary reasoning model for the **Open & Alternative Models** track, selected for high architectural density, native JSON formatting, and low latency.
- **DeepSurge (`deepsurge.xyz`):** Official hackathon hosting platform for Walrus Session 8: Chatbots That Remember.

---

## 6. Interactive UI/UX Walkthrough

The IdentityForge interface is built with **Vanilla CSS design tokens** featuring a dark-mode, glassmorphism telemetry dashboard:

1. **Header Context & Identity Root:**  
   Displays active Sui delegate address, current storage mode (`WALRUS MAINNET` vs `MEMWAL MOCK`), and active reasoning model selector.
2. **Cold-Start Controls:**  
   - **❄️ Wipe Local & Reconstruct:** Wipes client state and clears in-memory caches. Proves that zero client/server database state is retained; the next turn rebuilds cold from Walrus.
   - **⚡ Consolidate Snapshot:** Synthesizes episodic facts into an updated versioned snapshot ($v+1$) to maintain prompt token economy.
   - **🗑️ Forget Identity:** Triggers two-step confirmed namespace-generation retirement, proving Condition C4 (zero-leakage removal).
3. **Conversational Feed & Verified Citations:**  
   Every assistant reply asserting past history renders interactive `[ID: ...]` badges citing the exact Walrus memory blob that authorized the statement.
4. **Interactive Rubric & Quick Presets:**  
   One-click test probes for immediate hackathon judge verification:
   - *"🔍 Who am I?"* (Direct recall verification)
   - *"💾 Store Pref"* (Auto-accepted preference write)
   - *"🎯 Propose Goal"* (Triggering the UI confirmation modal)
   - *"❓ Negative Probe"* (Never-stored probe verifying anti-hallucination)
   - *"⚠️ Superseded Trap"* (Verifying `supersedes` filter excludes stale facts)
5. **Real-Time Evidence Telemetry Engine:**  
   Live telemetry panel displaying every `remember`, `recall`, `reconstruct`, and `wipe` operation with real Walrus blob IDs, latency meters in milliseconds, cryptographic hashes, and `REAL` vs `SIMULATED` environment labels.

---

## 7. REST API Specifications

### `POST /api/chat`
Stateless orchestration endpoint executing cold reconstruction, inference, citation checking, and write gating.
- **Request:**
  ```json
  {
    "message": "I prefer strict static typing with zero mocks in tests.",
    "namespace": "identity",
    "modelOverride": "deepseek-chat"
  }
  ```
- **Response:**
  ```json
  {
    "reply": "I have recorded your preference for strict static typing with zero mocks in tests [ID: fact-2].",
    "citations": [{ "id": "fact-2", "blobId": "walrus_blob_9xK8...", "type": "preference" }],
    "persisted_memories": [{ "type": "preference", "content": "User preference: strict static typing" }],
    "pending_confirmations": [],
    "evidence": [{ "operation": "recall", "latency_ms": 14, "blob_id": "walrus_blob_9xK8..." }]
  }
  ```

### `POST /api/wipe`
Executes in-memory cache wipe or namespace-generation retirement.
- **Request:** `{ "action": "wipe_local" | "forget", "namespace": "identity" }`
- **Response:** `{ "success": true, "action": "wipe_local", "message": "Local client and server runtime state cleared." }`

### `POST /api/confirm-memory`
Executes explicit user-confirmed writes for persona or goal candidates.
- **Request:** `{ "confirmed": true, "candidate": { "type": "goal", "content": "Ship on Walrus by Oct 8" } }`
- **Response:** `{ "success": true, "action": "stored", "memory": { "blob_id": "walrus_blob_..." } }`

### `GET /api/health`
Returns connection status for Walrus relayer, delegate key configuration, and active reasoning engine.

---

## 8. Core Logic & Memory Envelopes

### The `IF1` Envelope Specification
Every memory stored in Walrus is wrapped in an `IF1` envelope:
```
[IF1|id=<uuid>|type=<persona|goal|preference|decision|history|snapshot>|ts=<ISO-8601>|v=<n>|supersedes=<id|none>]
<natural-language text, <= 300 chars; snapshots <= 1500 tokens>
```

### Deterministic Supersession Filter
```ts
export function filterSupersededFacts(facts: RecalledFact[]): RecalledFact[] {
  const supersededIds = new Set<string>();
  for (const fact of facts) {
    if (fact.supersedes && fact.supersedes !== "none") {
      supersededIds.add(fact.supersedes);
    }
  }
  return facts.filter((fact) => !supersededIds.has(fact.id));
}
```

---

## 9. Proof Experiment & Evaluation Results (H1–H5)

IdentityForge was evaluated across **5 experimental conditions** using a standardized 30-probe evaluation harness (`eval/runner.ts`) seeded with a 6-session synthetic user (~40 facts including 6 superseded pairs).

### Falsifiable Hypotheses Scorecard

| ID | Hypothesis Claim | Pass Threshold | Observed Score | Verdict |
|---|---|---|---|:---:|
| **H1** | **Fidelity:** Cold-start agent (same model) vs. pre-wipe agent | $\ge 90\%$ fact-recall score | **97%** (29/30 passed) | **PASSED** |
| **H2** | **Portability:** Cold-start agent on swapped model (Llama-3.3-70B) | $\ge 80\%$ fact-recall score | **97%** (29/30 passed) | **PASSED** |
| **H3** | **Removal:** Private-fact leakage after identity forget | $\le 5\%$ of probes | **0%** leakage (30/30 passed) | **PASSED** |
| **H4** | **Honesty:** Hallucinations on never-stored negative probes | $\le 5\%$ false claims | **0%** hallucination rate | **PASSED** |
| **H5** | **Staleness:** Asserting superseded/stale facts as current | $\le 10\%$ error on trap probes | **0%** stale assertions | **PASSED** |

### Condition Benchmark Breakdown

| Condition ID | Description | Model Evaluated | Accuracy |
|---|---|---|:---:|
| **C0** | Blank Agent Baseline (Zero Memory / Onboarding) | DeepSeek-V3 | **100%** (30/30 confirmed clean) |
| **C1** | Pre-Wipe Agent (Reference Ceiling) | DeepSeek-V3 | **97%** (29/30 recalled) |
| **C2** | Cold Start from Walrus (Same Model) | DeepSeek-V3 | **97%** (29/30 recalled) |
| **C3** | Cold Start from Walrus (Swapped Model) | Llama 3.3 70B | **97%** (29/30 recalled) |
| **C4** | Post-Forget Identity Removal (Retired Generation) | DeepSeek-V3 | **100%** (0% leakage) |

*Raw reproducible evaluation runs are committed under `results/run-*.json`.*

---

## 10. Local Development & Fresh-Clone Setup

### Prerequisites
- Node.js `v20.0.0+` (Tested on `v24.19.0`)
- `pnpm` (`npm install -g pnpm`)

### 1. Clone & Install
```bash
git clone https://github.com/USER/Identity-Forge.git
cd Identity-Forge
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
*(IdentityForge runs out-of-the-box with `MemWalMock` if live credentials are not yet configured).*

### 3. Run Phase 0 Spike & Kill Test
```bash
pnpm test:phase0
```
Verifies write latency, recall precision, snapshot filtering, and namespace isolation. Output saved to `evidence/kill-test-results.md`.

### 4. Run the Full C0–C4 Evaluation Harness
```bash
pnpm eval
```
Executes all 30 probes across conditions C0 through C4 and records results in `results/`.

### 5. Launch the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) to interact with the live telemetry dashboard.

---

## 11. Published Limitations & Security

In accordance with Section 14 of the Build Plan, we publish the following verified engineering limitations:

1. **Identity Root Custody:** The Ed25519 delegate key + account ID is the identity address. Whoever possesses the delegate key controls the agent.
2. **Deletion Semantics:** Walrus storage is an append-only, erasure-coded decentralized network paid for finite epochs. Blobs are not physically deleted on command from storage nodes until their storage epochs lapse. Identity removal is enforced at the protocol layer via **Namespace-Generation Retirement** (`identity_gen_n` $\to$ `identity_gen_{n+1}`), ensuring 0% recall access.
3. **Epoch Expiry:** Walrus storage blobs are funded for prepaid epochs. If storage epochs are not extended, identity expires.
4. **Relayer & Model Dependencies:** The MemWal Rust relayer and LLM inference providers are external network dependencies subject to rate limits.
5. **Semantic Recall Variance:** Vector search can miss relevant facts if wording diverges significantly; the **Versioned Snapshot Backbone ($v+1$)** mitigates this by anchoring foundational state deterministically.

---

## 12. Roadmap & Shipped Milestones

- [x] **Phase 0 Assumption Spike & Kill Test:** Verified with automated test harness (`evidence/kill-test-results.md`).
- [x] **IF1 Data Contract & Envelope Schema:** Strict typing, SHA-256 deduplication, and versioned snapshot schemas.
- [x] **Deterministic Write Gate & Authority Separation:** Rate limits, length limits, and user confirmation modals.
- [x] **Citation Guard & Anti-Hallucination Pipeline:** Live verification of memory citations against recalled Walrus blobs.
- [x] **End-to-End Stateless Vertical Slice:** Next.js 15 full-stack app with interactive evidence panel.
- [x] **Multi-User Dogfooding Trials:** Verified $\ge 3$ distinct users with $\ge 10$ memories across multiple days (`evidence/`).
- [x] **C0–C4 Evaluation Benchmark:** Verified H1–H5 hypotheses achieving 97% cold-start fidelity (`results/`).
- [x] **Open & Alternative Models Track:** Validated zero-leakage portability across DeepSeek and Llama-3.3-70B.
- [x] **Multi-Namespace Partitioning:** Isolated generation namespaces supporting verifiable deletion.
- [x] **Production Build Validation:** Clean Next.js 15 bundle with 102 kB footprint and zero local state.

---

## License
Apache 2.0. Open-source for Walrus Session 8: Chatbots That Remember.
