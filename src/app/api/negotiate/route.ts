import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { resolveActiveGeminiModel, getGoogleProvider } from "../../../lib/gemini-client";
import { z } from "zod";
import { AnalyzedClause, NegotiationTone } from "../../../lib/schema";
import { generateDeterministicNegotiation } from "../../../lib/negotiation-generator";

export const maxDuration = 60;

const NegotiationResponseSchema = z.object({
  emailSubject: z.string().describe("Clear, professional email subject line"),
  emailBody: z.string().describe("Ready-to-send email body proposing amendments"),
  formalAddendumText: z
    .string()
    .describe("Formal Legal Addendum / Rider Schedule listing each clause and replacement language"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      contractTitle = "Agreement",
      selectedClauses = [],
      tone = "polite_student",
      counterpartyName,
      userName,
      userApiKey,
      preferredModel,
    } = body;

    const headerKey = req.headers.get("x-gemini-api-key");
    const apiKey = userApiKey?.trim() || headerKey?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const forceMock = process.env.USE_MOCK_DATA === "true";

    // If no clauses are selected, provide a graceful default message
    if (!selectedClauses || selectedClauses.length === 0) {
      return NextResponse.json(
        generateDeterministicNegotiation({
          contractTitle,
          selectedClauses: [
            {
              id: "default-1",
              sectionTitle: "Section: Notice of Entry & Repairs",
              severity: "warning",
              category: "Privacy & Entry",
              exactQuote: "Landlord may enter premises at any time.",
              plainEnglishSummary: "Requires 24 hours advance written notice for non-emergency inspections.",
              worstCaseScenario: "Unannounced visits during odd hours.",
              legalContextNote: "Standard municipal code requirement.",
              proposedAmendment: "Landlord shall provide at least twenty-four (24) hours advance written notice prior to entering the premises.",
            },
          ],
          tone,
          counterpartyName,
          userName,
        })
      );
    }

    // Zero-API-Key or forced mock execution
    if (!apiKey || forceMock) {
      // Artificial delay so user sees smooth loading animation
      await new Promise((r) => setTimeout(r, 600));
      const response = generateDeterministicNegotiation({
        contractTitle,
        selectedClauses,
        tone,
        counterpartyName,
        userName,
      });
      return NextResponse.json(response);
    }

    // Live AI Generation with Gemini 1.5 Flash
    try {
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
  selectedClauses.map((c: AnalyzedClause) => ({
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
   - You MUST separate paragraphs using double newlines ("\n\n").
   - The salutation (e.g. "Dear [Recipient],") MUST be on its own line followed by double newlines ("\n\n").
   - Break the message into 2-3 readable, concise paragraphs separated by double newlines ("\n\n").
   - The closing sign-off (e.g. "Warm regards," or "Sincerely,") and sender name MUST be on separate lines at the end, separated from the body by double newlines ("\n\n").
   - NEVER output the email as a single unbroken paragraph.
3. 'formalAddendumText': A binding 1-page Rider / Addendum Schedule with signature lines that supersedes the original problematic clauses.`;

      const activeModel = await resolveActiveGeminiModel(apiKey, preferredModel);
      const googleProvider = getGoogleProvider(apiKey);

      try {
        const result = await generateObject({
          model: googleProvider(activeModel),
          system: "You are an expert contract negotiation attorney and student advocate.",
          prompt,
          schema: NegotiationResponseSchema,
          temperature: 0.2,
          maxRetries: 0,
        });
        return NextResponse.json(result.object);
      } catch (mErr: any) {
        console.warn(`Negotiate model ${activeModel} failed, switching immediately to deterministic template:`, mErr?.message || mErr);
      }
    } catch (aiErr: any) {
      console.warn("AI generation failed in /api/negotiate, falling back to deterministic template:", aiErr);
      const fallback = generateDeterministicNegotiation({
        contractTitle,
        selectedClauses,
        tone,
        counterpartyName,
        userName,
      });
      return NextResponse.json(fallback);
    }
  } catch (error: any) {
    console.error("Unhandled error in /api/negotiate:", error);
    const fallback = generateDeterministicNegotiation({
      contractTitle: "Agreement",
      selectedClauses: [],
      tone: "polite_student",
    });
    return NextResponse.json(fallback);
  }
}
