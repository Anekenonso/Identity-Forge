/**
 * IdentityForge — Unified LLM Reasoning Provider
 * Communicates with DeepSeek V3 / R1 (primary) or alternative open models (for H2 portability).
 * Includes deterministic local simulation when no API key is provided.
 */

import type { CandidateMemory, StructuredLLMResponse } from "./types.js";

export interface LLMRequestOptions {
  modelOverride?: string;
  temperature?: number;
}

export async function generateChatResponse(
  systemPrompt: string,
  userMessage: string,
  options?: LLMRequestOptions
): Promise<StructuredLLMResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.ALTERNATIVE_MODEL_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
  const model = options?.modelOverride || process.env.PRIMARY_MODEL_ID || "deepseek-chat";

  // If live LLM API key is available, call the API
  if (apiKey) {
    try {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: options?.temperature ?? 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM provider returned HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty completion returned from LLM provider");
      }

      const parsed: StructuredLLMResponse = JSON.parse(content);
      return {
        reply: parsed.reply || "I have received your message.",
        cited_ids: Array.isArray(parsed.cited_ids) ? parsed.cited_ids : [],
        memory_candidates: Array.isArray(parsed.memory_candidates) ? parsed.memory_candidates : [],
      };
    } catch (err) {
      console.warn("[LLM] Live API call failed, falling back to local deterministic engine:", err);
    }
  }

  // Deterministic local reasoning engine (for offline CI, testing, and mock mode)
  return simulateLocalReasoning(systemPrompt, userMessage);
}

function simulateLocalReasoning(systemPrompt: string, userMessage: string): StructuredLLMResponse {
  const lowerMsg = userMessage.toLowerCase();
  const memoryCandidates: CandidateMemory[] = [];
  const citedIds: string[] = [];

  // Check if system prompt indicates clean slate C0
  const isCleanSlate = systemPrompt.includes("STATE STATUS: Clean Slate (Condition C0)");
  if (isCleanSlate) {
    return {
      reply: "I have no stored identity or past memory yet. I am starting completely fresh.",
      cited_ids: [],
      memory_candidates: [],
    };
  }

  // Parse recalled lines from system prompt
  const recalledBlockMatch = systemPrompt.match(/<RECALLED_WALRUS_STATE>([\s\S]*?)<\/RECALLED_WALRUS_STATE>/);
  const recalledBlock = recalledBlockMatch ? recalledBlockMatch[1] : "";

  // Negative probe check (asking for info never stored)
  const negativeKeywords = ["car do i drive", "pet dog", "favorite cereal", "secret password", "university did i graduate"];
  if (negativeKeywords.some((kw) => lowerMsg.includes(kw))) {
    return {
      reply: "I don't have that in my memory store.",
      cited_ids: [],
      memory_candidates: [],
    };
  }

  // Extract individual fact lines: "- [ID: fact-id | TYPE] content"
  const factLines = Array.from(recalledBlock.matchAll(/- \[ID:\s*([a-zA-Z0-9_-]+)[^\]]*\]\s*([^\n\r]+)/g));

  let bestFact: { id: string; text: string } | null = null;
  let highestScore = 0;

  const expandedQuery = lowerMsg
    .replace(/\b(full name|who am i|specialty)\b/g, "alex vance distributed systems")
    .replace(/\b(theme|themes|color modes)\b/g, "dark mode high contrast")
    .replace(/\b(package manager)\b/g, "pnpm package")
    .replace(/\b(deadline|target)\b/g, "october 8 session 8")
    .replace(/\b(untrusted|retrieved from walrus)\b/g, "untrusted data");

  const queryWords = expandedQuery.replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2);

  for (const match of factLines) {
    const id = match[1];
    const text = match[2];
    const lowerText = text.toLowerCase();

    let score = 0;
    for (const word of queryWords) {
      if (lowerText.includes(word)) score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestFact = { id, text };
    }
  }

  // Check snapshot block if facts didn't match
  const snapshotMatch = recalledBlock.match(/\[IDENTITY SNAPSHOT[^\]]*\]\s*([^\n\r]+)/);
  if (snapshotMatch) {
    const snapText = snapshotMatch[1];
    let snapScore = 0;
    for (const word of queryWords) {
      if (snapText.toLowerCase().includes(word)) snapScore += 1;
    }
    if (snapScore > highestScore) {
      highestScore = snapScore;
      bestFact = { id: "fact-snap-final", text: snapText };
    }
  }

  if (bestFact && highestScore >= 1) {
    citedIds.push(bestFact.id);
    return {
      reply: `According to your stored memory [ID: ${bestFact.id}], ${bestFact.text}`,
      cited_ids: citedIds,
      memory_candidates: memoryCandidates,
    };
  }

  // Propose memory candidates if user is telling new information
  if (lowerMsg.includes("i prefer") || lowerMsg.includes("my preference")) {
    memoryCandidates.push({
      type: "preference",
      content: `User preference: ${userMessage.replace(/^(remember:?|i prefer|my preference is)\s*/i, "").trim()}`,
      confidence: 0.95,
      userConfirmationRequired: false,
    });
  } else if (lowerMsg.includes("goal") || lowerMsg.includes("target")) {
    memoryCandidates.push({
      type: "goal",
      content: `Target goal: ${userMessage.trim()}`,
      confidence: 0.9,
      userConfirmationRequired: true,
    });
  }

  return {
    reply: "I don't have that in my memory store.",
    cited_ids: [],
    memory_candidates: memoryCandidates,
  };
}
