import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { ContractAuditResultSchema } from "../../../lib/schema";
import { resolveActiveGeminiModel, getGoogleProvider } from "../../../lib/gemini-client";
import {
  SAMPLE_CONTRACT_PRESETS,
  getDefaultSampleContract,
  getSampleContractById,
} from "../../../lib/sample-contracts";
import { analyzeCustomTextHeuristically } from "../../../lib/heuristic-analyzer";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { contractText, presetId, userApiKey, preferredModel } = body;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // 1. Direct preset request from 1-Click Judge Mode buttons
    if (presetId) {
      const preset = getSampleContractById(presetId);
      if (preset) {
        await delay(500);
        return NextResponse.json(preset.auditResult);
      }
    }

    // Determine API Key (from request body, request header, or server environment)
    const headerKey = req.headers.get("x-gemini-api-key");
    const apiKey = userApiKey || headerKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const forceMock = process.env.USE_MOCK_DATA === "true";

    // 2. If NO API key is available, use our intelligent local NLP heuristic parser on custom text
    if (!apiKey || forceMock) {
      await delay(700);

      // If the user provided custom text (e.g. typing or pasting "I can come to your house anytime"),
      // run the dynamic heuristic extractor so their exact sentences get quoted, categorized, and highlighted!
      if (contractText && contractText.trim().length > 0) {
        const dynamicAudit = analyzeCustomTextHeuristically(contractText);
        return NextResponse.json(dynamicAudit);
      }

      // If no text provided, fallback to default preset
      return NextResponse.json(getDefaultSampleContract().auditResult);
    }

    // 3. Live AI Analysis with Gemini
    if (!contractText || !contractText.trim()) {
      return NextResponse.json(
        { error: "No contract text was provided." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are ClauseClear, a world-class consumer-protection and student-advocacy legal auditing AI.
Your mission is to protect university students, first-time renters, and young freelancers from predatory contract clauses, hidden fees, unfair liabilities, and legal traps.

CRITICAL INSTRUCTIONS FOR EXHAUSTIVE CLAUSE COVERAGE:
1. EXHAUSTIVE SECTION COVERAGE: You MUST audit EVERY distinct numbered item, paragraph, and substantive covenant in the agreement without skipping any section! For short contracts (under 20 sections), evaluate EVERY SINGLE numbered item (e.g. Item 1, Item 2, Item 3, Item 4, Item 5, Item 6, etc.) so the user can verify whether each section is safe or risky.
2. BALANCED AUDIT OF BOTH SAFE AND RISKY CLAUSES:
   - For standard, fair, and safe clauses (e.g. residential use covenants, standard tenantable condition with fair wear and tear excepted, standard sublet consent requirements, standard pet/hazard prohibitions), mark their severity as 'fair' or 'info'. Explain why it is balanced or standard in 'plainEnglishSummary', give reassurance in 'legalContextNote', and set 'proposedAmendment' to 'No amendment needed; terms are standard and fair.'
   - For burdensome, ambiguous, or predatory clauses (e.g. entry with vague 'reasonable notice' instead of 24hr written notice, tenant paying landlord repairs, absolute alteration bans without landlord response timelines, unfair forfeitures), mark their severity as 'warning' or 'critical', and provide a protective 'proposedAmendment'.
3. 'exactQuote' MUST BE A VERBATIM, EXACT character-for-character substring from the text so our UI document highlighter can pinpoint and mark it in the text viewer.
4. 'plainEnglishSummary' must be a blunt, punchy, 1-sentence translation in plain English that a 20-year-old college student immediately grasps.
5. 'worstCaseScenario' must provide a realistic real-world dilemma or harm for critical/warning clauses (or a note confirming safety for fair/info clauses).
6. 'financialItems' must extract EVERY cost: base rent/fee, recurring monthly fees, one-time admin charges, and conditional penalties (e.g. late fees, repair deductibles). If none stated, return empty array.
7. 'missingProtections' must identify 2 to 4 crucial standard tenant/consumer protective terms that were left out entirely (e.g. 24h written notice, security deposit return window, habitability warranty).
8. SPEED & CONCISENESS: Keep each summary, note, and amendment crisp, blunt, and concise (under 25 words per field). Eliminate boilerplate text to maximize generation speed.`;

    const messages: any[] = [
      {
        role: "user",
        content: `Perform an exhaustive consumer-advocacy audit evaluating every clause and numbered section in the following agreement:\n\n${contractText}`,
      },
    ];

    // Resolve active model from Google ModelService (cached in memory)
    const activeModel = await resolveActiveGeminiModel(apiKey, preferredModel);
    const googleProvider = getGoogleProvider(apiKey);
    let lastError: any = null;
    let quotaHit = false;
    let is503 = false;
    let is404 = false;

    try {
      // Exactly ONE request with zero retries so quota is never wasted
      const result = await generateObject({
        model: googleProvider(activeModel),
        system: systemPrompt,
        messages,
        schema: ContractAuditResultSchema,
        temperature: 0.1,
        maxRetries: 0,
      });

      const { quotaNotice: _ignored, ...cleanObject } = (result.object || {}) as any;
      return NextResponse.json({
        ...cleanObject,
        engineUsed: activeModel,
      });
    } catch (aiError: any) {
      lastError = aiError;
      const msg = String(aiError?.message || aiError || "");
      console.warn(`Model ${activeModel} failed (${msg}), jumping directly to heuristic engine...`);

      if (
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("limit: 20") ||
        msg.includes("quota") ||
        msg.includes("rate limit")
      ) {
        quotaHit = true;
      } else if (
        msg.includes("503") ||
        msg.includes("high demand") ||
        msg.includes("ServiceUnavailable") ||
        msg.includes("overloaded")
      ) {
        is503 = true;
      } else if (msg.includes("404") || msg.includes("NotFound")) {
        is404 = true;
      }
    }

    // If Google returned 429, 503, or failed, immediately jump to local heuristic NLP
    if (contractText && contractText.trim().length > 0) {
      const quotaNotice = quotaHit
        ? "Google AI returned 429 Too Many Requests (Rate limit / Free Tier quota reached). Seamlessly switched to ClauseClear Local Heuristic Engine."
        : is503
        ? "Google AI returned 503 Service Unavailable (High server demand). Seamlessly switched to ClauseClear Local Heuristic Engine."
        : is404
        ? "Google AI model endpoint not found (404). Seamlessly switched to ClauseClear Local Heuristic Engine."
        : "Google AI service unavailable. Seamlessly switched to ClauseClear Local Heuristic Engine.";

      const heuristicAudit = analyzeCustomTextHeuristically(contractText);
      return NextResponse.json({
        ...heuristicAudit,
        engineUsed: "local-heuristic",
        quotaNotice,
      });
    }

    // File-based analysis failed and there is no text for the heuristic engine.
    // Return a real error so the client can inform the user, not a random sample.
    return NextResponse.json(
      { error: "AI analysis failed for this file." },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Unhandled error in /api/analyze:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
