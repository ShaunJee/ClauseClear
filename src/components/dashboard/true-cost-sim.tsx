"use client";

import React from "react";
import { AlertTriangle, Check, Layers, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useAuditStore } from "../../store/use-audit-store";
import { formatCurrency } from "../../lib/scoring";
import { CountUp } from "../ui/count-up";

const money = (n: number) => formatCurrency(Math.round(n));

export function TrueCostSimulator() {
  const {
    auditResult,
    riskMetrics,
    simulatedPenalties,
    toggleSimulatedPenalty,
    setIsNegotiationOpen,
  } = useAuditStore();

  if (!auditResult || !riskMetrics) return null;

  const advertisedBase = auditResult.advertisedMonthlyBase || 0;
  const monthlyMandatoryItems = auditResult.financialItems.filter(
    (item) =>
      item.frequency === "monthly_mandatory" &&
      !item.label.toLowerCase().includes("base") &&
      !item.label.toLowerCase().includes("advertised")
  );
  const oneTimeItems = auditResult.financialItems.filter(
    (item) => item.frequency === "one_time_mandatory"
  );
  const conditionalPenalties = auditResult.financialItems.filter(
    (item) => item.frequency === "conditional_penalty"
  );

  const activePenaltiesSum = conditionalPenalties.reduce(
    (sum, item) => (simulatedPenalties[item.id] ? sum + item.amount : sum),
    0
  );
  const activePenaltiesCount = conditionalPenalties.filter(
    (item) => simulatedPenalties[item.id]
  ).length;

  const totalMandatoryMonthly = riskMetrics.trueMonthlyMandatory;
  const annualAdvertised = advertisedBase * 12;
  const annualMandatoryTrue = totalMandatoryMonthly * 12 + riskMetrics.oneTimeMandatory;
  const annualWorstCase = annualMandatoryTrue + activePenaltiesSum;
  const hiddenAnnualSurprise = Math.max(0, annualMandatoryTrue - annualAdvertised);
  const denom = annualWorstCase || 1;

  return (
    <div className="space-y-6">
      {/* Hero comparison */}
      <section className="cc-card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl"
        />

        <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="cc-label">What you&apos;ll actually pay</p>
            <p className="font-display text-6xl font-extrabold leading-none sm:text-7xl">
              <CountUp value={totalMandatoryMonthly} format={money} />
              <span className="ml-1 text-2xl font-semibold text-slate-400">/mo</span>
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-600 dark:text-slate-300">
              {riskMetrics.hiddenMonthlyDiff > 0 ? (
                <>
                  <span>
                    Advertised <s className="text-slate-400">{money(advertisedBase)}</s>
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    +{money(riskMetrics.hiddenMonthlyDiff)}/mo hidden
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Advertised base: <strong className="font-semibold text-slate-900 dark:text-white">{money(advertisedBase)}/mo</strong>
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                    No hidden monthly markup
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 p-5 dark:border-rose-400/20 dark:bg-rose-500/10">
            <p className="cc-label !text-rose-700 dark:!text-rose-300">Surprise over 12 months</p>
            <p className="font-display mt-1 text-4xl font-extrabold text-rose-700 dark:text-rose-300">
              +<CountUp value={hiddenAnnualSurprise} format={money} />
            </p>
            <p className="mt-1 text-sm text-rose-900/80 dark:text-rose-200/80">
              Includes move-in fees. Enough for{" "}
              {Math.max(1, Math.round(hiddenAnnualSurprise / 60))} grocery runs.
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex justify-end">
          <button onClick={() => setIsNegotiationOpen(true)} className="cc-btn-primary whitespace-nowrap">
            <Sparkles className="h-4 w-4 shrink-0" /> <span className="whitespace-nowrap">Negotiate these fees out</span>
          </button>
        </div>
      </section>

      {/* Bars */}
      <section className="cc-card space-y-5 p-6">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="h-5 w-5 text-indigo-500" /> 12-month liability
        </h2>
        {[
          {
            label: "Advertised rent",
            value: annualAdvertised,
            bar: "bg-slate-400 dark:bg-slate-500",
            text: "text-slate-700 dark:text-slate-300",
          },
          {
            label: "True mandatory cost",
            value: annualMandatoryTrue,
            bar: "bg-gradient-to-r from-amber-500 to-orange-400",
            text: "text-amber-800 dark:text-amber-300",
          },
          ...(activePenaltiesSum > 0
            ? [
                {
                  label: "Worst case with active what-ifs",
                  value: annualWorstCase,
                  bar: "bg-gradient-to-r from-rose-500 to-fuchsia-500",
                  text: "text-rose-700 dark:text-rose-300",
                },
              ]
            : []),
        ].map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className={`font-semibold ${row.text}`}>{row.label}</span>
              <span className={`font-mono font-bold ${row.text}`}>{money(row.value)}</span>
            </div>
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${row.bar}`}
                style={{ width: `${Math.min(100, (row.value / denom) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Fees + What-ifs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cc-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <Layers className="h-5 w-5 text-amber-500" />{" "}
              {monthlyMandatoryItems.length === 0 && oneTimeItems.length > 0
                ? "Mandatory upfront fees"
                : "Buried fees"}
            </h2>
            <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
              {riskMetrics.hiddenMonthlyDiff > 0
                ? `+${money(riskMetrics.hiddenMonthlyDiff)}/mo`
                : riskMetrics.oneTimeMandatory > 0
                ? `+${money(riskMetrics.oneTimeMandatory)} upfront`
                : "$0 hidden"}
            </span>
          </div>

          {monthlyMandatoryItems.length === 0 && oneTimeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200/90 bg-emerald-50/50 p-8 text-center dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <p className="font-display mt-3 text-base font-bold text-slate-800 dark:text-slate-100">
                No hidden mandatory fees detected
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Clean contract! The advertised base fee matches your actual monthly baseline, with zero mandatory valet trash, portal, or technology surcharges buried in the text.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 font-mono text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                $0 unexpected monthly markup
              </span>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {monthlyMandatoryItems.map((fee) => (
                <li
                  key={fee.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-bold">{fee.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mandatory, every month
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400">
                      +{money(fee.amount)}/mo
                    </p>
                    <p className="text-xs text-slate-400">+{money(fee.amount * 12)}/yr</p>
                  </div>
                </li>
              ))}
              {oneTimeItems.map((fee) => (
                <li
                  key={fee.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div>
                    <p className="text-sm font-bold">{fee.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">One-time</p>
                  </div>
                  <p className="font-mono text-sm font-bold">+{money(fee.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cc-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="h-5 w-5 text-rose-500" /> What if...?
            </h2>
            <span className="font-mono text-sm font-bold text-rose-700 dark:text-rose-400">
              {conditionalPenalties.length === 0
                ? "None detected"
                : activePenaltiesCount > 0
                ? `+${money(activePenaltiesSum)}`
                : "Flip a switch"}
            </span>
          </div>

          {conditionalPenalties.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/70 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-300">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="font-display mt-3 text-base font-bold text-slate-800 dark:text-slate-100">
                No conditional penalty traps found
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Zero surprise penalty triggers detected. This contract does not contain compounding daily late fees, repair deductibles, lockout surcharges, or punitive holdover clauses.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                  ✓ No repair deductibles
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                  ✓ No lockout fees
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                  ✓ No holdover spikes
                </span>
              </div>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {conditionalPenalties.map((penalty) => {
                const isOn = !!simulatedPenalties[penalty.id];
                return (
                  <li key={penalty.id}>
                    <button
                      role="switch"
                      aria-checked={isOn}
                      onClick={() => toggleSimulatedPenalty(penalty.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                        isOn
                          ? "border-rose-300 bg-rose-50 dark:border-rose-400/40 dark:bg-rose-500/10"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition ${
                          isOn ? "bg-rose-500" : "bg-slate-300 dark:bg-white/20"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-all ${
                            isOn ? "left-[18px]" : "left-0.5"
                          }`}
                        >
                          {isOn && <Check className="h-3 w-3 text-rose-600" strokeWidth={3} />}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">{penalty.label}</span>
                          <span
                            className={`font-mono text-sm font-bold ${
                              isOn ? "text-rose-700 dark:text-rose-300" : "text-slate-500"
                            }`}
                          >
                            +{money(penalty.amount)}
                          </span>
                        </span>
                        {penalty.triggerCondition && (
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            If: {penalty.triggerCondition}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
