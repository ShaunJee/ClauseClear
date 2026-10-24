import { z } from "zod";

/**
 * Severity level for analyzed contract clauses
 */
export const ClauseSeveritySchema = z.enum(["critical", "warning", "fair", "info"]);

/**
 * Standardized categorization for contract risks
 */
export const ClauseCategorySchema = z.enum([
  "Financial Liability",
  "Termination & Renewal",
  "Privacy & Entry",
  "Maintenance & Repairs",
  "IP & Ownership",
  "Liability & Waivers",
]);

/**
 * Single analyzed contract clause
 */
export const AnalyzedClauseSchema = z.object({
  id: z.string().describe("Unique identifier like clause-1, clause-2"),
  sectionTitle: z
    .string()
    .describe("Heading or clause number from the contract, e.g., 'Section 14: Entry by Landlord'"),
  severity: ClauseSeveritySchema,
  category: ClauseCategorySchema,
  exactQuote: z
    .string()
    .describe("Verbatim substring quote from the contract text so the frontend can highlight it"),
  plainEnglishSummary: z
    .string()
    .describe("Direct, jargon-free 1-sentence translation for a college student"),
  worstCaseScenario: z
    .string()
    .describe("Concrete real-world example of how this clause could hurt the signer"),
  legalContextNote: z
    .string()
    .describe("Educational note on standard tenant/contract norms (not formal legal advice)"),
  proposedAmendment: z
    .string()
    .describe("Fair, balanced replacement wording the user can ask to substitute"),
});

/**
 * Frequency and type of extracted financial obligations
 */
export const FinancialFrequencySchema = z.enum([
  "monthly_mandatory",
  "one_time_mandatory",
  "conditional_penalty",
]);

/**
 * Individual fee, base price, or penalty extracted from the contract
 */
export const FinancialItemSchema = z.object({
  id: z.string().describe("Unique identifier like fee-1, fee-2"),
  label: z
    .string()
    .describe("Name of cost or fee, e.g., 'Base Monthly Rent', 'Smart Lock Fee', 'Late Payment Penalty'"),
  amount: z.number().describe("Dollar amount in USD (positive number)"),
  frequency: FinancialFrequencySchema,
  triggerCondition: z
    .string()
    .optional()
    .describe("For conditional penalties, what triggers it, e.g., 'Rent paid after 11:59 PM on the 3rd'"),
});

/**
 * Missing standard legal and tenant protections
 */
export const MissingProtectionSchema = z.object({
  title: z.string().describe("Name of the missing protection, e.g., '24-Hour Notice of Entry'"),
  whyItMatters: z
    .string()
    .describe("Why this missing protection is risky or unfair to the student"),
  suggestedAddition: z
    .string()
    .describe("Standard protective language that should be added to the agreement"),
});

/**
 * Top-level contract classification
 */
export const ContractTypeSchema = z.enum([
  "Residential Lease",
  "Internship / Employment",
  "Freelance / IP",
  "Subscription / Gym",
  "General Agreement",
]);

/**
 * Complete structured audit result emitted by LLM or mock sandbox
 */
export const ContractAuditResultSchema = z.object({
  contractTitle: z.string().describe("Human-readable title for the contract"),
  contractType: ContractTypeSchema,
  executiveSummary: z
    .string()
    .describe("2-sentence punchy overview of the contract's overall fairness and balance"),
  advertisedMonthlyBase: z
    .number()
    .describe("The headline monthly price or rent stated in the contract, or 0 if not applicable"),
  clauses: z.array(AnalyzedClauseSchema).describe("List of extracted and categorized clauses"),
  financialItems: z.array(FinancialItemSchema).describe("List of all extracted costs and penalties"),
  missingProtections: z
    .array(MissingProtectionSchema)
    .describe("Important protective clauses that were omitted from the agreement"),
  engineUsed: z.string().optional().describe("Identifier of model or engine that performed the audit"),
});

/**
 * Negotiation Counter-Offer Generation Schemas
 */
export const NegotiationToneSchema = z.enum([
  "polite_student",
  "firm_tenant",
  "statutory_citation",
]);

export const NegotiationRequestSchema = z.object({
  contractTitle: z.string(),
  contractType: ContractTypeSchema,
  selectedClauseIds: z.array(z.string()),
  clauses: z.array(AnalyzedClauseSchema),
  tone: NegotiationToneSchema,
  counterpartyName: z.string().optional(),
  userName: z.string().optional(),
});

export const NegotiationResponseSchema = z.object({
  emailSubject: z.string(),
  emailBody: z.string(),
  formalAddendumText: z.string(),
});

// Inferred TypeScript Types
export type ClauseSeverity = z.infer<typeof ClauseSeveritySchema>;
export type ClauseCategory = z.infer<typeof ClauseCategorySchema>;
export type AnalyzedClause = z.infer<typeof AnalyzedClauseSchema>;
export type FinancialFrequency = z.infer<typeof FinancialFrequencySchema>;
export type FinancialItem = z.infer<typeof FinancialItemSchema>;
export type MissingProtection = z.infer<typeof MissingProtectionSchema>;
export type ContractType = z.infer<typeof ContractTypeSchema>;
export type ContractAuditResult = z.infer<typeof ContractAuditResultSchema> & {
  quotaNotice?: string;
};
export type NegotiationTone = z.infer<typeof NegotiationToneSchema>;
export type NegotiationRequest = z.infer<typeof NegotiationRequestSchema>;
export type NegotiationResponse = z.infer<typeof NegotiationResponseSchema>;
