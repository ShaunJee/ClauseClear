"use client";

import React from "react";
import { DollarSign, ArrowRight, Zap } from "lucide-react";
import { useAuditStore, AuditFilter } from "../../store/use-audit-store";
import { getScoreColorTokens, formatCurrency } from "../../lib/scoring";
import { useCountUp } from "../ui/count-up";

export function ScoreHeader() {
  const { contractTitle, auditResult, riskMetrics, setActiveTab, setActiveFilter } =
    useAuditStore();

  const score = riskMetrics?.overallScore ?? 0;
  const animated = useCountUp(score, 750);

  if (!auditResult || !riskMetrics) {
    return null;
  }

  const colorTokens = getScoreColorTokens(score);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animated / 100) * circumference;

  const hasHiddenFees =
    riskMetrics.hiddenMonthlyDiff > 0 || riskMetrics.annualHiddenSurcharge > 0;

  const stats: { id: AuditFilter; n: number; label: string; dot: string; text: string }[] = [
    {
      id: "critical",
      n: riskMetrics.criticalCount,
      label: "Red flags",
      dot: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
    },
    {
      id: "warning",
      n: riskMetrics.warningCount,
      label: "Warnings",
      dot: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "fair",
      n: riskMetrics.fairCount,
      label: "Safe",
      dot: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 dark:border-white/10">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorTokens.gradient} opacity-[0.07] dark:opacity-[0.12]`}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {auditResult.quotaNotice && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-semibold">{auditResult.quotaNotice}</span>
            </div>
            <span className="whitespace-nowrap rounded-md bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Local Heuristic Engine Active
            </span>
          </div>
        )}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          {/* Score + verdict */}
          <div className="flex items-start gap-5 sm:items-center">
            {/* Interactive Score Circle */}
            <div
              onClick={() => setActiveTab("clauses")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("clauses");
                }
              }}
              role="button"
              tabIndex={0}
              title={`Fairness score ${score} of 100: ${riskMetrics.gradeLabel}. Click to inspect clauses.`}
              className="group relative h-28 w-28 shrink-0 cursor-pointer rounded-full transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
              aria-label={`Fairness score ${score} out of 100: ${riskMetrics.gradeLabel}. Click to inspect clauses.`}
            >
              {/* Dynamic Ambient Glow Behind Circle */}
              <div
                className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-300 ${
                  score >= 80
                    ? "bg-emerald-500/20 group-hover:bg-emerald-500/35"
                    : score >= 50
                    ? "bg-amber-500/20 group-hover:bg-amber-500/35"
                    : "bg-rose-500/20 group-hover:bg-rose-500/35"
                }`}
              />

              <svg className="relative h-full w-full -rotate-90 drop-shadow-sm" viewBox="0 0 96 96">
                <defs>
                  <linearGradient id="score-grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="score-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="score-grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>

                {/* Background Ring Track */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  strokeWidth="8.5"
                  className="fill-none stroke-slate-200/70 dark:stroke-white/10"
                />

                {/* Progress Bar with Green/Amber/Red Gradient */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  strokeWidth="8.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke={
                    score >= 80
                      ? "url(#score-grad-emerald)"
                      : score >= 50
                      ? "url(#score-grad-amber)"
                      : "url(#score-grad-rose)"
                  }
                  className="fill-none transition-[stroke-dashoffset] duration-75 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-display text-4xl font-black leading-none tracking-tight transition-colors ${colorTokens.text}`}
                >
                  {Math.round(animated)}
                </span>
                <span className="mt-0.5 text-xs font-semibold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                  of 100
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${colorTokens.bg} ${colorTokens.text} ${colorTokens.border}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      score >= 80
                        ? "bg-emerald-500"
                        : score >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  />
                  {riskMetrics.gradeLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {auditResult.contractType}
                </span>
              </div>

              <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {contractTitle || auditResult.contractTitle}
              </h1>

              {/* Full details without ellipsis or truncation */}
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {auditResult.executiveSummary}
              </p>
            </div>
          </div>

          {/* Clickable stat tiles */}
          <dl className="grid grid-cols-3 gap-2.5 lg:w-80">
            {stats.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveFilter(s.id);
                  setActiveTab("clauses");
                }}
                className="cc-card px-3 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
                aria-label={`Show ${s.label.toLowerCase()} (${s.n})`}
              >
                <dd className={`font-display text-3xl font-extrabold leading-none ${s.text}`}>
                  {s.n}
                </dd>
                <dt className="mt-1.5 flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} /> {s.label}
                </dt>
              </button>
            ))}
          </dl>
        </div>

        {/* Hidden fee callout */}
        {hasHiddenFees && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/20 dark:from-amber-500/10 dark:to-orange-500/10">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-bold text-amber-950 dark:text-amber-100">
                  {riskMetrics.hiddenMonthlyDiff > 0 && riskMetrics.oneTimeMandatory > 0 ? (
                    <>
                      Advertised {formatCurrency(riskMetrics.advertisedMonthlyBase)}/mo → really{" "}
                      {formatCurrency(riskMetrics.trueMonthlyMandatory)}/mo (+{formatCurrency(riskMetrics.oneTimeMandatory)} upfront)
                    </>
                  ) : riskMetrics.hiddenMonthlyDiff > 0 ? (
                    <>
                      Advertised {formatCurrency(riskMetrics.advertisedMonthlyBase)}/mo → really{" "}
                      {formatCurrency(riskMetrics.trueMonthlyMandatory)}/mo
                    </>
                  ) : (
                    <>
                      {formatCurrency(riskMetrics.advertisedMonthlyBase)}/mo rent +{" "}
                      {formatCurrency(riskMetrics.oneTimeMandatory)} in mandatory move-in fees
                    </>
                  )}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300/90">
                  {riskMetrics.hiddenMonthlyDiff > 0 ? (
                    <>That&apos;s {formatCurrency(riskMetrics.annualHiddenSurcharge)} in total extra charges over a year.</>
                  ) : (
                    <>Includes mandatory security deposit and upfront fees ({formatCurrency(riskMetrics.advertisedMonthlyBase * 12 + riskMetrics.oneTimeMandatory)} total first-year cost).</>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("true_cost")}
              className="inline-flex items-center gap-1.5 whitespace-nowrap self-start text-sm font-bold text-amber-900 underline-offset-4 hover:underline sm:self-auto dark:text-amber-200"
            >
              See the math <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
