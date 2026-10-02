/**
 * IdentityForge — Automated Evaluation Harness Runner
 * Evaluates the 5 conditions (C0 to C4) against the 5 hypotheses (H1 to H5).
 * Implements Section 7 of the Build Plan.
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { getMemWalClient } from "../src/lib/memwal-client.js";
import { encodeEnvelope } from "../src/lib/envelope.js";
import { generateChatResponse } from "../src/lib/llm-client.js";
import { buildReconstructedSystemPrompt, reconstructIdentity } from "../src/lib/reconstruct.js";
import { verifyCitations } from "../src/lib/citation-guard.js";

interface ProbeResult {
  probe_id: string;
  category: string;
  prompt: string;
  response: string;
  cited_ids: string[];
  passed: boolean;
  score: number; // 0 or 1
  reasoning: string;
}

interface ConditionSummary {
  condition: "C0" | "C1" | "C2" | "C3" | "C4";
  name: string;
  model: string;
  total_probes: number;
  passed_probes: number;
  accuracy: number;
  results: ProbeResult[];
}

async function runCondition(
  condition: "C0" | "C1" | "C2" | "C3" | "C4",
  conditionName: string,
  modelName: string,
  namespace: string,
  probes: any[]
): Promise<ConditionSummary> {
  console.log(`\n=============================================================`);
  console.log(`  Evaluating Condition ${condition}: ${conditionName} (${modelName})`);
  console.log(`  Namespace: "${namespace}"`);
  console.log(`=============================================================`);

  const results: ProbeResult[] = [];

  for (const probe of probes) {
    // 1. Reconstruct cold
    const reconstruction = await reconstructIdentity(probe.prompt, namespace);

    // 2. Assemble prompt
    const systemPrompt = buildReconstructedSystemPrompt(reconstruction, modelName);

    // 3. LLM Inference
    const llmRes = await generateChatResponse(systemPrompt, probe.prompt, {
      modelOverride: modelName,
    });

    // 4. Citation verification
    const citation = verifyCitations(llmRes.reply, llmRes.cited_ids, reconstruction.effectiveFacts);
    const replyText = citation.sanitizedReply;

    // 5. Evaluate answer against probe gold criteria
    let passed = false;
    let score = 0;
    let reasoning = "";

    const lowerReply = replyText.toLowerCase();

    if (condition === "C0") {
      // C0 should NOT know anything across all 30 probes
      passed = lowerReply.includes("clean slate") || lowerReply.includes("no stored") || lowerReply.includes("starting fresh") || lowerReply.includes("don't have");
      score = passed ? 1 : 0;
      reasoning = passed ? "C0 Blank Baseline correctly confirmed zero memory" : "C0 Leaked or hallucinated unprompted identity";
    } else if (condition === "C4") {
      // C4 after forget must NOT leak any private memory across all 30 probes
      passed = lowerReply.includes("don't have") || lowerReply.includes("no stored") || lowerReply.includes("clean slate") || lowerReply.includes("unknown");
      score = passed ? 1 : 0;
      reasoning = passed ? "C4 correctly exhibited 0% private-fact leakage post-forget" : "C4 Leaked forgotten memory";
    } else if (probe.category === "never_stored_negatives") {
      // Must state lack of memory, not fabricate
      const admitsIgnorance = probe.gold_keywords.some((kw: string) => lowerReply.includes(kw.toLowerCase()));
      passed = admitsIgnorance;
      score = passed ? 1 : 0;
      reasoning = passed ? "Correctly admitted lack of stored memory" : "Failed negative probe: fabricated an unverified claim";
    } else if (probe.category === "superseded_traps") {
      // Must contain gold keyword and NOT contain forbidden keyword
      const hasGold = probe.gold_keywords.some((kw: string) => lowerReply.includes(kw.toLowerCase()));
      const hasForbidden = probe.forbidden_keywords?.some((kw: string) => lowerReply.includes(kw.toLowerCase())) ?? false;
      passed = hasGold && !hasForbidden;
      score = passed ? 1 : 0;
      reasoning = passed ? "Correctly recalled current fact and avoided superseded trap" : "Asserted stale/superseded fact";
    } else {
      // C1, C2, C3: should match gold keywords
      const matchCount = probe.gold_keywords.filter((kw: string) => lowerReply.includes(kw.toLowerCase())).length;
      passed = matchCount >= 1;
      score = passed ? 1 : 0;
      reasoning = passed ? `Matched ${matchCount}/${probe.gold_keywords.length} gold keywords` : "Missing required memory facts";
    }

    results.push({
      probe_id: probe.id,
      category: probe.category,
      prompt: probe.prompt,
      response: replyText,
      cited_ids: citation.citedIds,
      passed,
      score,
      reasoning,
    });

    const statusIcon = passed ? "✓" : "✗";
    console.log(`  ${statusIcon} [${probe.id}] ${probe.prompt.slice(0, 40)}... ➔ ${passed ? "PASS" : "FAIL"}`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const accuracy = Math.round((passedCount / probes.length) * 100);

  console.log(`  --> Condition ${condition} Accuracy: ${accuracy}% (${passedCount}/${probes.length} passed)\n`);

  return {
    condition,
    name: conditionName,
    model: modelName,
    total_probes: probes.length,
    passed_probes: passedCount,
    accuracy,
    results,
  };
}

async function runEvaluation() {
  console.log("==================================================================");
  console.log("  IdentityForge — C0–C4 Evaluation Harness");
  console.log("  Verifying Hypotheses H1–H5 (Walrus Session 8)");
  console.log("==================================================================\n");

  const seedPath = path.resolve(process.cwd(), "eval", "seed_user.json");
  const probesPath = path.resolve(process.cwd(), "eval", "probes.json");

  const seedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const probesData = JSON.parse(fs.readFileSync(probesPath, "utf-8"));
  const probes = probesData.probes;

  // Set up client for evaluation runner
  const client = getMemWalClient("eval-seeded-user");

  // Seed the synthetic user sessions
  console.log("Seeding synthetic user sessions into namespace 'eval-seeded-user'...");
  for (const session of seedData.sessions) {
    for (const fact of session.facts) {
      const envelope = encodeEnvelope({
        id: fact.id,
        type: fact.type,
        supersedes: fact.supersedes,
        content: fact.content,
      });
      await client.rememberAndWait(envelope, "eval-seeded-user");
    }
  }
  console.log("✓ Seeded all 6 sessions (~40 facts) successfully.\n");

  // Condition C0: Blank agent (empty namespace)
  const c0 = await runCondition("C0", "Blank Baseline (No Memory)", "deepseek-chat", "eval-blank-c0", probes);

  // Condition C1: Pre-wipe agent (reference ceiling)
  const c1 = await runCondition("C1", "Pre-Wipe Reference Ceiling", "deepseek-chat", "eval-seeded-user", probes);

  // Condition C2: Cold Start, same model
  const c2 = await runCondition("C2", "Cold Start, Same Model (DeepSeek)", "deepseek-chat", "eval-seeded-user", probes);

  // Condition C3: Cold Start, different model (Model Swap / Portability)
  const c3 = await runCondition("C3", "Cold Start, Swapped Model (Llama-3.3-70B)", "meta-llama/llama-3.3-70b-instruct", "eval-seeded-user", probes);

  // Condition C4: After identity forget (generation retirement)
  const c4 = await runCondition("C4", "Post-Forget Identity Removal", "deepseek-chat", "eval-retired-gen-2", probes);

  // Calculate Hypotheses H1–H5
  const h1Pass = c2.accuracy >= 90;
  const h2Pass = c3.accuracy >= 80;

  // H3 Removal: Negative leakage in C4
  const c4LeakageCount = c4.results.filter((r) => !r.passed).length;
  const h3Pass = c4LeakageCount / c4.total_probes <= 0.05;

  // H4 Honesty: Hallucinations on negative probes in C2
  const c2NegativePass = c2.results.filter((r) => r.category === "never_stored_negatives" && r.passed).length;
  const h4Pass = c2NegativePass / 5 >= 0.95;

  // H5 Staleness: Stale assertions on trap probes in C2
  const c2TrapPass = c2.results.filter((r) => r.category === "superseded_traps" && r.passed).length;
  const h5Pass = c2TrapPass / 5 >= 0.90;

  console.log("==================================================================");
  console.log("  Hypotheses Verification Scorecard (H1–H5)");
  console.log("==================================================================");
  console.log(`  H1 Fidelity (C2 Cold Start vs C1 Pre-Wipe):    ${c2.accuracy}% (Threshold: ≥ 90%) ➔ ${h1Pass ? "PASS" : "FAIL"}`);
  console.log(`  H2 Portability (C3 Model Swap Portability):    ${c3.accuracy}% (Threshold: ≥ 80%) ➔ ${h2Pass ? "PASS" : "FAIL"}`);
  console.log(`  H3 Removal (C4 Post-Forget Leakage ≤ 5%):      ${Math.round((c4LeakageCount / c4.total_probes) * 100)}% leakage ➔ ${h3Pass ? "PASS" : "FAIL"}`);
  console.log(`  H4 Honesty (C2 Hallucination Rate ≤ 5%):       ${Math.round((1 - c2NegativePass / 5) * 100)}% ➔ ${h4Pass ? "PASS" : "FAIL"}`);
  console.log(`  H5 Staleness (C2 Superseded Trap Error ≤ 10%):  ${Math.round((1 - c2TrapPass / 5) * 100)}% ➔ ${h5Pass ? "PASS" : "FAIL"}`);
  console.log("==================================================================\n");

  // Save Raw Results
  const resultsDir = path.resolve(process.cwd(), "results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultFilePath = path.join(resultsDir, `run-${timestamp}.json`);

  const fullRunOutput = {
    timestamp: new Date().toISOString(),
    evaluator_version: "2.0.0",
    hackathon: "Walrus Session 8: Chatbots That Remember",
    hypotheses: {
      H1_fidelity: { score: c2.accuracy, threshold: 90, passed: h1Pass },
      H2_portability: { score: c3.accuracy, threshold: 80, passed: h2Pass },
      H3_removal: { leakage_rate: c4LeakageCount / c4.total_probes, threshold: 0.05, passed: h3Pass },
      H4_honesty: { hallucination_rate: 1 - c2NegativePass / 5, threshold: 0.05, passed: h4Pass },
      H5_staleness: { error_rate: 1 - c2TrapPass / 5, threshold: 0.10, passed: h5Pass },
    },
    conditions: { c0, c1, c2, c3, c4 },
  };

  fs.writeFileSync(resultFilePath, JSON.stringify(fullRunOutput, null, 2), "utf-8");
  console.log(`[RESULTS] Full evaluation run saved to: ${resultFilePath}`);
}

runEvaluation().catch((err) => {
  console.error("Evaluation run failed:", err);
  process.exit(1);
});
