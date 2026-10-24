import {
  ContractAuditResult,
  ClauseCategory,
  ClauseSeverity,
} from "./schema";

export type GradeLabel =
  | "Predatory / High Risk"
  | "Heavily One-Sided"
  | "Proceed with Caution"
  | "Balanced & Fair";

export interface ComputedRiskMetrics {
  overallScore: number; // 0 to 100
  gradeLabel: GradeLabel;
  gradeDescription: string;
  criticalCount: number;
  warningCount: number;
  fairCount: number;
  infoCount: number;
  totalClauseCount: number;
  advertisedMonthlyBase: number;
  trueMonthlyMandatory: number;
  hiddenMonthlyDiff: number;
  oneTimeMandatory: number;
  annualHiddenSurcharge: number;
  potentialPenaltySum: number;
  categoryBreakdown: Record<ClauseCategory, number>; // 0 (safe) to 100 (extreme risk)
}

/**
 * Deterministically computes the fairness score (0-100) and risk metrics
 * based on the extracted clauses and financial obligations.
 */
export function calculateRiskMetrics(audit: ContractAuditResult): ComputedRiskMetrics {
  let score = 100;
  let criticalCount = 0;
  let warningCount = 0;
  let fairCount = 0;
  let infoCount = 0;

  const categoryRisk: Record<ClauseCategory, number> = {
    "Financial Liability": 0,
    "Termination & Renewal": 0,
    "Privacy & Entry": 0,
    "Maintenance & Repairs": 0,
    "IP & Ownership": 0,
    "Liability & Waivers": 0,
  };

  for (const clause of audit.clauses) {
    if (clause.severity === "critical") {
      score -= 18;
      criticalCount++;
      categoryRisk[clause.category] = Math.min(
        100,
        (categoryRisk[clause.category] || 0) + 40
      );
    } else if (clause.severity === "warning") {
      score -= 8;
      warningCount++;
      categoryRisk[clause.category] = Math.min(
        100,
        (categoryRisk[clause.category] || 0) + 20
      );
    } else if (clause.severity === "fair") {
      fairCount++;
    } else if (clause.severity === "info") {
      infoCount++;
    }
  }

  // Deduct 4 points for each omitted standard protective clause
  const missingPenalty = (audit.missingProtections?.length || 0) * 4;
  score -= missingPenalty;

  // Clamp score strictly between 5 and 100
  const clampedScore = Math.max(5, Math.min(100, Math.round(score)));

  let gradeLabel: GradeLabel = "Balanced & Fair";
  let gradeDescription =
    "This agreement adheres to consumer and tenant protection standards with minimal unexpected liabilities.";

  if (clampedScore < 45) {
    gradeLabel = "Predatory / High Risk";
    gradeDescription =
      "Critical red flags detected. Contains clauses that may be legally unenforceable, strip core statutory rights, or expose the signer to extreme financial liability.";
  } else if (clampedScore < 68) {
    gradeLabel = "Heavily One-Sided";
    gradeDescription =
      "Significant imbalance favoring the counterparty. Multiple burdensome clauses, buried fees, or disproportionate termination penalties require amendment before signing.";
  } else if (clampedScore < 85) {
    gradeLabel = "Proceed with Caution";
    gradeDescription =
      "Mostly standard agreement with several clauses that warrant clarification or protective rider additions.";
  }

  // Financial calculations
  const advertisedBase = audit.advertisedMonthlyBase || 0;

  const monthlyMandatoryAdditions = audit.financialItems
    .filter((item) => item.frequency === "monthly_mandatory")
    .reduce((sum, item) => sum + item.amount, 0);

  // If advertisedBase is already explicitly listed as one of the monthly_mandatory items, don't double count
  const hasBaseInItems = audit.financialItems.some(
    (item) =>
      item.frequency === "monthly_mandatory" &&
      item.label.toLowerCase().includes("base")
  );

  const trueMonthlyMandatory = hasBaseInItems
    ? monthlyMandatoryAdditions
    : advertisedBase + monthlyMandatoryAdditions;

  const hiddenMonthlyDiff = Math.max(0, trueMonthlyMandatory - advertisedBase);

  const oneTimeMandatory = audit.financialItems
    .filter((item) => item.frequency === "one_time_mandatory")
    .reduce((sum, item) => sum + item.amount, 0);

  const annualHiddenSurcharge = hiddenMonthlyDiff * 12 + oneTimeMandatory;

  const potentialPenaltySum = audit.financialItems
    .filter((item) => item.frequency === "conditional_penalty")
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    overallScore: clampedScore,
    gradeLabel,
    gradeDescription,
    criticalCount,
    warningCount,
    fairCount,
    infoCount,
    totalClauseCount: audit.clauses.length,
    advertisedMonthlyBase: advertisedBase,
    trueMonthlyMandatory,
    hiddenMonthlyDiff,
    oneTimeMandatory,
    annualHiddenSurcharge,
    potentialPenaltySum,
    categoryBreakdown: categoryRisk,
  };
}

/**
 * Returns Tailwind color tokens for the given fairness score (supports both light and dark mode)
 */
export function getScoreColorTokens(score: number): {
  text: string;
  bg: string;
  border: string;
  ring: string;
  glow: string;
  gradient: string;
  strokeColor: string;
} {
  if (score >= 80) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200 dark:border-emerald-500/30",
      ring: "stroke-emerald-500 dark:stroke-emerald-400",
      glow: "shadow-emerald-500/25",
      gradient: "from-emerald-500 to-teal-500",
      strokeColor: "#10b981",
    };
  }
  if (score >= 50) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/30",
      ring: "stroke-amber-500 dark:stroke-amber-400",
      glow: "shadow-amber-500/25",
      gradient: "from-amber-500 to-orange-500",
      strokeColor: "#f59e0b",
    };
  }
  return {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    border: "border-rose-200 dark:border-rose-500/30",
    ring: "stroke-rose-500 dark:stroke-rose-400",
    glow: "shadow-rose-500/25",
    gradient: "from-rose-500 to-red-600",
    strokeColor: "#f43f5e",
  };
}

/**
 * Returns styling tokens for clause severity badges with clean contrast in light and dark modes
 */
export function getSeverityStyle(severity: ClauseSeverity): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  highlightMark: string;
} {
  switch (severity) {
    case "critical":
      return {
        label: "Critical Red Flag",
        bg: "bg-rose-50 dark:bg-rose-500/10",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200 dark:border-rose-500/30",
        dot: "bg-rose-500",
        highlightMark:
          "bg-rose-100 dark:bg-rose-500/20 text-rose-950 dark:text-rose-100 border-b-2 border-rose-500 font-medium",
      };
    case "warning":
      return {
        label: "Warning / Amber Flag",
        bg: "bg-amber-50 dark:bg-amber-500/10",
        text: "text-amber-800 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-500/30",
        dot: "bg-amber-500",
        highlightMark:
          "bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-100 border-b-2 border-amber-500 font-medium",
      };
    case "fair":
      return {
        label: "Fair / Protective",
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        text: "text-emerald-800 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-500/30",
        dot: "bg-emerald-500",
        highlightMark:
          "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 border-b-2 border-emerald-500 font-medium",
      };
    case "info":
    default:
      return {
        label: "Informational",
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
        dot: "bg-slate-400",
        highlightMark:
          "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-b border-slate-400",
      };
  }
}

/**
 * Formats a numeric USD amount nicely
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
