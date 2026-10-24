import { ContractAuditResult, AnalyzedClause, NegotiationTone } from "./schema";
import { calculateRiskMetrics } from "./scoring";

export interface GeminiModelOption {
  id: string;
  name: string;
  tier: "flash" | "flagship" | "lite" | "legacy";
  tierLabel: string;
  badge?: string;
  description: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  // 1. Workhorse & Speed Models (Flash Family)
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    tier: "flash",
    tierLabel: "Workhorse & Speed",
    badge: "Default",
    description: "Balances Pro-level legal auditing with high speed and lower token pricing.",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    tier: "flash",
    tierLabel: "Workhorse & Speed",
    description: "Most intelligent Flash model, engineered for long-horizon software and complex workflows.",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    tier: "flash",
    tierLabel: "Workhorse & Speed",
    description: "Mid-tier refinement balancing deep reasoning with token efficiency.",
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    tier: "flash",
    tierLabel: "Workhorse & Speed",
    description: "Intelligent everyday driver for fast clause scanning and analysis.",
  },
  // 2. Flagship & Advanced Reasoning Models
  {
    id: "gemini-4-argon",
    name: "Gemini 4 Argon",
    tier: "flagship",
    tierLabel: "Flagship & Reasoning",
    badge: "Frontier",
    description: "Google's latest flagship frontier model with 1M token context and deep execution.",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    tier: "flagship",
    tierLabel: "Flagship & Reasoning",
    description: "Stable high-capability Pro model for adaptive thinking and complex legal analysis.",
  },
  // 3. High-Throughput & Budget Models (Lite Family)
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    tier: "lite",
    tierLabel: "High-Throughput & Budget",
    badge: "Fastest",
    description: "Extremely fast, lowest-latency model optimized for high-volume text tasks.",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    tier: "lite",
    tierLabel: "High-Throughput & Budget",
    description: "Highly cost-efficient baseline model for massive-scale text workloads.",
  },
];

const PREFERRED_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-4-argon",
  "gemini-2.5-pro",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const browserModelCache = new Map<string, string>();

/**
 * Dynamically resolves the best available Gemini model for the user's API key.
 * Prioritizes the user's preferred model, then falls back through the supported list.
 */
export async function resolveBrowserGeminiModel(
  apiKey: string,
  preferredModel?: string
): Promise<string> {
  const cleanKey = apiKey.trim();
  const userChoice =
    preferredModel ||
    (typeof window !== "undefined"
      ? localStorage.getItem("clauseclear_selected_model") || "gemini-3.5-flash"
      : "gemini-3.5-flash");

  const cacheKey = `${cleanKey}:${userChoice}`;
  if (browserModelCache.has(cacheKey)) {
    return browserModelCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
    );

    if (res.ok) {
      const data = await res.json();
      const models: any[] = data.models || [];
      const supported = models
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      // 1. If user's preferred model is supported by this key, select it immediately
      if (supported.includes(userChoice)) {
        browserModelCache.set(cacheKey, userChoice);
        return userChoice;
      }

      // 2. Otherwise check fallback hierarchy
      for (const pref of PREFERRED_MODELS) {
        if (supported.includes(pref)) {
          browserModelCache.set(cacheKey, pref);
          return pref;
        }
      }

      if (supported.length > 0) {
        browserModelCache.set(cacheKey, supported[0]);
        return supported[0];
      }
    }
  } catch (err) {
    console.warn("Direct browser ModelService query failed, falling back to chosen model:", err);
  }

  return userChoice;
}

/**
 * Verifies a Gemini API key directly from the browser by listing available models.
 */
export async function testGeminiKeyDirectly(
  apiKey: string,
  targetModel?: string
): Promise<{ ok: boolean; message: string; model?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { ok: false, message: "Please provide an API key." };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
    );
    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `Google API returned status ${res.status}`;
      return { ok: false, message: errMsg };
    }

    const model = await resolveBrowserGeminiModel(cleanKey, targetModel);
    return {
      ok: true,
      message: `Verified! Active model: ${model}. Ready for live client-side audits.`,
      model,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Failed to connect to Google Gemini API from browser.",
    };
  }
}

const AUDIT_SYSTEM_PROMPT = `You are ClauseClear, a world-class consumer-protection and student-advocacy legal auditing AI.
Your mission is to protect university students, first-time renters, and young freelancers from predatory contract clauses, hidden fees, unfair liabilities, and legal traps.

CRITICAL INSTRUCTIONS FOR EXHAUSTIVE CLAUSE COVERAGE:
1. EXHAUSTIVE SECTION COVERAGE: You MUST audit EVERY distinct numbered item, paragraph, and substantive covenant in the agreement without skipping any section. For short contracts (under 20 sections), evaluate EVERY SINGLE numbered item so the user can verify whether each section is safe or risky.
2. BALANCED AUDIT OF BOTH SAFE AND RISKY CLAUSES:
   - For standard, fair, and safe clauses, mark severity as 'fair' or 'info'. Explain why it is balanced or standard in 'plainEnglishSummary', give reassurance in 'legalContextNote', and set 'proposedAmendment' to 'No amendment needed; terms are standard and fair.'
   - For burdensome, ambiguous, or predatory clauses, mark severity as 'warning' or 'critical', and provide a protective 'proposedAmendment'.
3. 'exactQuote' MUST BE A VERBATIM, EXACT character-for-character substring from the text so our UI document highlighter can pinpoint and mark it in the text viewer.
4. 'plainEnglishSummary' must be a blunt, punchy, 1-sentence translation in plain English that a 20-year-old college student immediately grasps.
5. 'worstCaseScenario' must provide a realistic real-world dilemma or harm for critical/warning clauses (or a note confirming safety for fair/info clauses).
6. 'financialItems' must extract EVERY cost: base rent/fee, recurring monthly fees, one-time admin charges, and conditional penalties (e.g. late fees, repair deductibles). If none stated, return empty array.
7. 'missingProtections' must identify 2 to 4 crucial standard tenant/consumer protective terms that were left out entirely (e.g. 24h written notice, security deposit return window, habitability warranty).
8. SPEED & CONCISENESS: Keep each summary, note, and amendment crisp, blunt, and concise (under 25 words per field).

You MUST return ONLY valid JSON matching this schema:
{
  "contractTitle": "string",
  "documentType": "lease" | "employment" | "service_agreement" | "nda" | "other",
  "summary": "string",
  "advertisedBasePriceDisplay": "string (e.g. $1,200/mo)",
  "financialItems": [
    {
      "id": "string",
      "label": "string",
      "amount": number,
      "billingType": "monthly_mandatory" | "one_time_mandatory" | "conditional_penalty",
      "description": "string",
      "frequency": "monthly" | "one_time" | "annual" | "per_occurrence"
    }
  ],
  "clauses": [
    {
      "id": "string",
      "sectionTitle": "string",
      "severity": "critical" | "warning" | "fair" | "info",
      "category": "Financial Liability" | "Termination & Renewal" | "Privacy & Entry" | "Maintenance & Repairs" | "IP & Ownership" | "Liability & Waivers",
      "exactQuote": "string",
      "plainEnglishSummary": "string",
      "worstCaseScenario": "string",
      "legalContextNote": "string",
      "proposedAmendment": "string"
    }
  ],
  "missingProtections": [
    {
      "id": "string",
      "title": "string",
      "importance": "high" | "medium" | "low",
      "description": "string",
      "suggestedAddition": "string"
    }
  ]
}`;

/**
 * Executes a full contract audit directly from the client browser via Google Gemini REST API.
 */
export async function callGeminiAuditDirectly(options: {
  apiKey: string;
  preferredModel?: string;
  contractText: string;
}): Promise<ContractAuditResult> {
  const { apiKey, preferredModel, contractText } = options;
  const cleanKey = apiKey.trim();

  if (!cleanKey) {
    throw new Error("No Gemini API key provided.");
  }
  if (!contractText || !contractText.trim()) {
    throw new Error("No contract text provided.");
  }

  const model = await resolveBrowserGeminiModel(cleanKey, preferredModel);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

  const parts = [
    {
      text: `Perform an exhaustive consumer-advocacy audit evaluating every clause and numbered section in the following agreement:\n\n${contractText}`,
    },
  ];

  const requestBody = {
    systemInstruction: {
      parts: [{ text: AUDIT_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Google API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No content generated by Gemini.");
  }

  const cleanedJsonText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleanedJsonText);

  // Ensure clauses have valid IDs
  const clauses: AnalyzedClause[] = (parsed.clauses || []).map((c: any, idx: number) => ({
    id: c.id || `c-${idx + 1}`,
    sectionTitle: c.sectionTitle || `Clause ${idx + 1}`,
    severity: c.severity || "warning",
    category: c.category || "Financial Liability",
    exactQuote: c.exactQuote || "",
    plainEnglishSummary: c.plainEnglishSummary || "",
    worstCaseScenario: c.worstCaseScenario || "",
    legalContextNote: c.legalContextNote || "",
    proposedAmendment: c.proposedAmendment || "",
  }));

  const partialAudit: any = {
    contractTitle: parsed.contractTitle || "Analyzed Agreement",
    documentType: parsed.documentType || "lease",
    overallScore: 100,
    gradeLabel: "Proceed with Caution",
    summary: parsed.summary || "AI contract audit completed.",
    advertisedBasePriceDisplay: parsed.advertisedBasePriceDisplay || "$1,200/mo",
    financialItems: parsed.financialItems || [],
    clauses,
    missingProtections: parsed.missingProtections || [],
    engineUsed: `gemini-direct (${model})`,
  };

  // Compute mathematically consistent metrics
  const metrics = calculateRiskMetrics(partialAudit);
  partialAudit.overallScore = metrics.overallScore;
  partialAudit.gradeLabel = metrics.gradeLabel;
  partialAudit.categoryBreakdown = metrics.categoryBreakdown;

  return partialAudit as ContractAuditResult;
}

/**
 * Generates counter-offer negotiation email and formal rider directly from the browser via Gemini.
 */
export async function callGeminiNegotiateDirectly(options: {
  apiKey: string;
  preferredModel?: string;
  contractTitle: string;
  selectedClauses: AnalyzedClause[];
  tone: NegotiationTone;
  counterpartyName?: string;
  userName?: string;
}): Promise<{ emailSubject: string; emailBody: string; formalAddendumText: string }> {
  const { apiKey, preferredModel, contractTitle, selectedClauses, tone, counterpartyName, userName } = options;
  const cleanKey = apiKey.trim();

  if (!cleanKey) {
    throw new Error("No API key provided.");
  }

  const toneGuidance =
    tone === "polite_student"
      ? "Friendly, eager, respectful university student asking politely for balanced terms while emphasizing their excitement to sign."
      : tone === "statutory_citation" || (tone as any) === "statutory_formal"
      ? "Formal, authoritative legal perspective referencing tenant rights, bilateral fairness, and statutory standards."
      : "Firm, direct, professional business professional negotiating standard commercial terms without hostility.";

  const prompt = `Generate a high-converting counter-offer email and a formal contractual Addendum Schedule for the following contract and flagged issues:

CONTRACT TITLE: ${contractTitle}
DESIRED TONE: ${tone} (${toneGuidance})
RECIPIENT: ${counterpartyName || "Property Manager / Organization"}
SENDER: ${userName || "Prospective Signer / Student"}

FLAGGED CLAUSES TO AMEND:
${JSON.stringify(
  selectedClauses.map((c) => ({
    section: c.sectionTitle,
    originalQuote: c.exactQuote,
    studentSummary: c.plainEnglishSummary,
    proposedReplacement: c.proposedAmendment,
  })),
  null,
  2
)}

REQUIREMENTS:
1. 'emailSubject': Engaging, professional subject line.
2. 'emailBody': Complete ready-to-send email incorporating the concerns and proposed amendments naturally.
   CRITICAL FORMATTING REQUIREMENT FOR 'emailBody':
   - You MUST separate paragraphs using double newlines ("\\n\\n").
   - The salutation (e.g. "Dear [Recipient],") MUST be on its own line followed by double newlines ("\\n\\n").
   - Break the message into 2-3 readable, concise paragraphs separated by double newlines ("\\n\\n").
   - The closing sign-off and sender name MUST be on separate lines at the end.
3. 'formalAddendumText': A binding 1-page Rider / Addendum Schedule with signature lines that supersedes the original problematic clauses.

You MUST return ONLY valid JSON:
{
  "emailSubject": "string",
  "emailBody": "string",
  "formalAddendumText": "string"
}`;

  const model = await resolveBrowserGeminiModel(cleanKey, preferredModel);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No counter-offer generated.");
  }

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}
