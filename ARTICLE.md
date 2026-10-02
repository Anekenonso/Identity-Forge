# IdentityForge: Rebuilding Autonomous Agent Identity Cold from Decentralized Walrus Memory

*How we decoupled agent persona, goals, and history from centralized databases and ephemeral context windows, achieving 97% cold-start fidelity across open LLMs.*

---

### The Problem: The Stateless Void and Custodial Trap

Conversational AI agents face an existential dilemma: when a session ends or a container restarts, the agent awakens into a stateless void—a blank slate that forgets who it is, what it agreed to, and who it was talking to.

Developers usually tackle this with two compromises:
1. **Pumping massive context windows:** Stuffing full conversation logs into prompts, which spikes token costs, dilutes reasoning, and hits hard context limits.
2. **Centralized database custody:** Storing history in PostgreSQL or vector SaaS platforms, introducing centralized failure points and opaque deletion.

If the database host crashes or deprecates its API, the agent's living identity is wiped. Users lack cryptographic proof of what the agent remembers and have no sovereign ownership of their personal data.

At the **Walrus Session 8: Chatbots That Remember** hackathon, we asked:

> *Can an autonomous agent's durable identity live exclusively in decentralized, erasure-coded Walrus storage—such that it can be cold-started on a completely different open LLM with over 90% fidelity?*

That question led to **IdentityForge**.

---

### Architecture: How IdentityForge Uses Walrus Memory

IdentityForge implements a zero-local-state architecture. The server holds no SQLite database, no Redis cache, and no PostgreSQL instances. The agent’s entire identity root is represented by an **Ed25519 cryptographic delegate key** registered to the decentralized Walrus Memory protocol (`@mysten-incubation/memwal`).

Every persistent unit of state conforms to our **IF1 Data Contract**:

```typescript
interface MemoryEnvelope {
  schema: "IF1";
  type: "persona" | "goal" | "preference" | "decision" | "history" | "snapshot";
  content: string;
  supersedes?: string;
  evidence_hash: string;
  created_at: string;
}
```

#### 1. The Deterministic Write Gate: Code Owns Authority
A common vulnerability in memory-augmented chatbots is prompt injection or runaway hallucination: an LLM writes false memories or duplicates trivial dialogue. 

In IdentityForge, **AI proposes, but deterministic code approves**. Every memory proposal passes through a strict TypeScript gate enforcing:
- Maximum 300 characters per memory fact.
- Rate cap of at most 5 writes per dialogue turn.
- SHA-256 deduplication to prevent blob spam.
- Mandatory user confirmation for foundational changes (persona shifts or new core goals).

#### 2. Cold Reconstruction & The Versioned Snapshot Backbone ($v+1$)
On every inbound message, IdentityForge performs a cold reconstruction:
1. It queries Walrus Memory for the latest **Identity Snapshot** envelope, which compiles the agent’s foundational baseline (Persona, Active Goals, Key Decisions).
2. It fetches semantic episodic facts tailored to the user's specific prompt.
3. It filters out superseded memories (ensuring outdated information is excluded).
4. It synthesizes a hardened system prompt injected with citations (`[mem:blob_id]`).

Before streaming the reply to the user, our **Citation Guard** validates that every memory claim references a real, recalled Walrus blob. Unsubstantiated claims trigger deterministic fallbacks.

---

### The Experiment: 5 Conditions, 30 Probes, 97% Fidelity

To prove our thesis to skeptical technical judges, we engineered an automated evaluation harness testing 30 standardized probes across 5 conditions:

- **Condition C1 (Ceiling):** Pre-wipe live agent.
- **Condition C2 (Cold Start - DeepSeek):** Fresh deployment rebuilt purely from Walrus blobs.
- **Condition C3 (Model Swap Portability):** Cold start executed on an alternative open model (**Llama-3.3-70B-Instruct**).
- **Condition C4 (Forget Removal):** Verified deletion state after identity wipe.

#### The Results
| Hypothesis | Metric Tested | Threshold | Achieved | Status |
|---|---|---|---|---|
| **H1 (Fidelity)** | Cold start fact recall vs pre-wipe | $\ge 90\%$ | **97%** (29/30) | **PASS** |
| **H2 (Portability)** | Model swap recall on Llama-3.3 | $\ge 80\%$ | **97%** (29/30) | **PASS** |
| **H3 (Removal)** | Post-forget private-fact leakage | $\le 5\%$ | **0.0%** (0/30) | **PASS** |
| **H4 (Honesty)** | Hallucinated unseeded claims | $\le 5\%$ | **0.0%** (0/30) | **PASS** |
| **H5 (Staleness)** | Assertion of superseded traps | $\le 10\%$ | **0.0%** (0/30) | **PASS** |

Because Walrus blobs are immutable and paid for finite epochs, physical deletion cannot be forced on storage nodes mid-epoch. IdentityForge solves this with **Namespace-Generation Retirement** (`identity_gen_n` $\to$ `identity_gen_{n+1}`), mathematically ensuring 0% recall leakage upon user request.

---

### Why This Matters

IdentityForge proves that AI personality does not belong to model weights or centralized platforms. By anchoring memory to decentralized, erasure-coded blobs on Walrus, we make agents truly sovereign, portable, and user-owned. An agent can migrate from a cloud server to a local edge device, swap from DeepSeek to Llama, or travel across web3 ecosystems without losing a single memory.

Explore our code and live telemetry dashboard:
- **GitHub:** [https://github.com/Anekenonso/Identity-Forge](https://github.com/Anekenonso/Identity-Forge)
- **Built for:** Walrus Session 8: Chatbots That Remember
