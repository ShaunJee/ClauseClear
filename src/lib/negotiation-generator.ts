import { AnalyzedClause, NegotiationTone } from "./schema";

export interface NegotiationResult {
  emailSubject: string;
  emailBody: string;
  formalAddendumText: string;
}

/**
 * Deterministic template generator for 100% reliable offline/zero-API-key execution
 * Works directly in both browser client components and server environments.
 */
export function generateDeterministicNegotiation({
  contractTitle,
  selectedClauses,
  tone,
  counterpartyName = "Property Manager / Leasing Team",
  userName = "Prospective Tenant",
}: {
  contractTitle: string;
  selectedClauses: AnalyzedClause[];
  tone: NegotiationTone | "statutory_formal";
  counterpartyName?: string;
  userName?: string;
}): NegotiationResult {
  const isStudent = tone === "polite_student";
  const isStatutory = tone === "statutory_citation" || (tone as any) === "statutory_formal";

  let emailSubject = "";
  let greeting = `Dear ${counterpartyName},`;
  let openingParagraph = "";
  let closingParagraph = "";

  if (isStudent) {
    emailSubject = `Excited to sign! Quick question regarding ${contractTitle} terms`;
    openingParagraph = `Thank you so much for sending over the agreement for ${contractTitle}! I am really looking forward to this opportunity and am eager to finalize everything. Before executing the signature page, my family and university student advisor reviewed the terms and asked me to clarify a few specific sections so that we have complete mutual alignment.`;
    closingParagraph = `I truly appreciate your time and flexibility in working with me on these items. Would you be open to incorporating these modest adjustments into a brief 1-page addendum so I can sign and return the finalized agreement right away?\n\nWarm regards,\n${userName}`;
  } else if (isStatutory) {
    emailSubject = `Notice of Proposed Contractual Amendments - ${contractTitle}`;
    openingParagraph = `Thank you for transmitting the proposed ${contractTitle}. Following a comprehensive compliance review against prevailing consumer protection statutes and statutory habitability standards, I am submitting the following necessary amendments to ensure bilateral enforceability prior to execution.`;
    closingParagraph = `The attached proposed Rider harmonizes the agreement with applicable statutory mandates while preserving your core commercial interests. Please confirm receipt and transmit an updated execution copy incorporating these amendments at your earliest convenience.\n\nSincerely,\n${userName}`;
  } else {
    // firm_tenant
    emailSubject = `Review of ${contractTitle} - Requested Contractual Amendments`;
    openingParagraph = `Thank you for sending the ${contractTitle}. I have reviewed the agreement in detail and am prepared to move forward. However, there are several one-sided clauses that I request we amend to reflect standard balanced commercial practices before I sign.`;
    closingParagraph = `I am confident these standard adjustments will establish a positive, transparent relationship. Please review the attached Schedule of Amendments and let me know when an updated execution version can be provided.\n\nBest regards,\n${userName}`;
  }

  // Build clause items summary for email body
  const clauseBulletPoints = selectedClauses.map((clause, index) => {
    return `${index + 1}. ${clause.sectionTitle}:\n   • Concern: ${clause.plainEnglishSummary}\n   • Proposed Revision: ${clause.proposedAmendment}`;
  }).join("\n\n");

  const fullEmailBody = `${greeting}\n\n${openingParagraph}\n\n${clauseBulletPoints}\n\n${closingParagraph}`;

  // Build formal Addendum Schedule
  const addendumHeader = `SCHEDULE OF CONTRACT AMENDMENTS (RIDER A)
Agreement: ${contractTitle}
Signer: ${userName}
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

The following terms and conditions are hereby incorporated into and made an integral part of the above-referenced Agreement. In the event of any conflict or inconsistency between the terms of the Agreement and this Rider, the terms of this Rider shall strictly govern and control:`;

  const addendumClauses = selectedClauses.map((clause, index) => {
    return `AMENDMENT ITEM ${index + 1}: [MODIFICATION OF ${clause.sectionTitle.toUpperCase()}]
A. Original Language Superseded:
   "${clause.exactQuote}"

B. Binding Replacement Language:
   "${clause.proposedAmendment}"`;
  }).join("\n\n------------------------------------------------------------\n\n");

  const addendumFooter = `\n\nIN WITNESS WHEREOF, the parties hereto have executed this Addendum as of the date first set forth above.

TENANT / SIGNER: ____________________     DATE: ______________
LANDLORD / COUNTERPARTY: _____________     DATE: ______________`;

  return {
    emailSubject,
    emailBody: fullEmailBody,
    formalAddendumText: `${addendumHeader}\n\n------------------------------------------------------------\n\n${addendumClauses}${addendumFooter}`,
  };
}
