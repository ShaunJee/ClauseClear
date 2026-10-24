"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  Copy,
  MapPin,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";
import { useAuditStore, AuditFilter } from "../../store/use-audit-store";
import { AnalyzedClause } from "../../lib/schema";
import { getSeverityStyle } from "../../lib/scoring";
import { flashMark } from "../../lib/flash";

export function ClauseFeed() {
  const {
    auditResult,
    selectedClauseId,
    setSelectedClauseId,
    activeFilter,
    setActiveFilter,
    selectedClauseIdsForNegotiation,
    toggleClauseForNegotiation,
    selectAllFlaggedForNegotiation,
    setIsNegotiationOpen,
  } = useAuditStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Auto-expand the card when its highlight is clicked in the contract
  useEffect(() => {
    if (selectedClauseId) {
      setOpen((prev) => (prev.has(selectedClauseId) ? prev : new Set(prev).add(selectedClauseId)));
    }
  }, [selectedClauseId]);

  if (!auditResult) return null;

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLocate = (clause: AnalyzedClause) => {
    setSelectedClauseId(clause.id);
    flashMark(clause.id);
  };

  const clauses = auditResult.clauses;
  const count = (sev: string) => clauses.filter((c) => c.severity === sev).length;
  const criticalCount = count("critical");
  const warningCount = count("warning");
  const fairCount = count("fair");
  const missingCount = auditResult.missingProtections?.length || 0;

  const filtered = clauses.filter((c) => activeFilter === "all" || c.severity === activeFilter);
  const pushCount = selectedClauseIdsForNegotiation.length;

  const filters: { id: AuditFilter; label: string; n: number; dot?: string }[] = [
    { id: "all", label: "All", n: clauses.length },
    { id: "critical", label: "Red flags", n: criticalCount, dot: "bg-rose-500" },
    { id: "warning", label: "Warnings", n: warningCount, dot: "bg-amber-500" },
    { id: "fair", label: "Safe", n: fairCount, dot: "bg-emerald-500" },
    { id: "missing", label: "Missing", n: missingCount, dot: "bg-violet-500" },
  ];

  return (
    <div className="cc-card relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="space-y-3 border-b border-slate-200/80 p-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold">What it means</h2>
          <button
            onClick={selectAllFlaggedForNegotiation}
            className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Flag all traps ({criticalCount + warningCount})
          </button>
        </div>

        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Filter clauses"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={activeFilter === f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition ${
                activeFilter === f.id
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              }`}
            >
              {f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} />}
              {f.label} <span className="font-mono text-xs opacity-70">{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className={`flex-1 space-y-3.5 overflow-y-auto p-4 ${pushCount > 0 ? "pb-24" : ""}`}>
        {activeFilter === "missing" ? (
          <>
            <p className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-relaxed text-violet-900 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
              <strong>Protections this contract leaves out.</strong> Ask for these in your counter-offer.
            </p>
            {auditResult.missingProtections.map((item, idx) => (
              <article key={idx} className="cc-card space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-base font-bold">{item.title}</h3>
                  <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300">
                    Missing
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.whyItMatters}
                </p>
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3.5 dark:border-violet-400/20 dark:bg-violet-500/10">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="cc-label !text-violet-700 dark:!text-violet-300">
                      Suggested addition
                    </span>
                    <button
                      onClick={() => handleCopy(`missing-${idx}`, item.suggestedAddition)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-white/10"
                    >
                      {copiedId === `missing-${idx}` ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-sm leading-relaxed text-violet-950 dark:text-violet-100">
                    &ldquo;{item.suggestedAddition}&rdquo;
                  </p>
                </div>
              </article>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">Nothing in this category. 🎉</p>
        ) : (
          filtered.map((clause) => {
            const isSelected = selectedClauseId === clause.id;
            const isPush = selectedClauseIdsForNegotiation.includes(clause.id);
            const isOpen = open.has(clause.id);
            const sev = getSeverityStyle(clause.severity);
            const isFair = clause.severity === "fair";

            return (
              <article
                key={clause.id}
                id={`card-${clause.id}`}
                className={`cc-card relative overflow-hidden transition ${
                  isSelected
                    ? "!border-indigo-500 ring-4 ring-indigo-500/15"
                    : "hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${sev.dot}`} />

                <div className="space-y-3 p-4 pl-6 sm:p-5 sm:pl-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${sev.bg} ${sev.text} ${sev.border}`}
                    >
                      {sev.label}
                    </span>
                    <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                      {clause.category}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold leading-snug">
                    {clause.sectionTitle}
                  </h3>

                  <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">
                    {clause.plainEnglishSummary}
                  </p>

                  {isOpen && (
                    <div className="anim-rise space-y-3 pt-1">
                      {!isFair && clause.worstCaseScenario && (
                        <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3.5 dark:border-rose-400/20 dark:bg-rose-500/10">
                          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-rose-800 dark:text-rose-300">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> Worst case
                          </p>
                          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {clause.worstCaseScenario}
                          </p>
                        </div>
                      )}

                      {isFair && (
                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> Protective term - no changes needed
                          </p>
                          <p className="text-sm leading-relaxed text-emerald-950/80 dark:text-emerald-200/90">
                            This clause already protects your interests and aligns with standard tenant-friendly regulations. No counter-offer or revision is necessary.
                          </p>
                        </div>
                      )}

                      <blockquote className={`font-paper flex gap-2.5 border-l-2 pl-3 text-sm italic leading-relaxed ${
                        isFair
                          ? "border-emerald-400 text-slate-700 dark:border-emerald-500/40 dark:text-slate-300"
                          : "border-slate-300 text-slate-500 dark:border-white/20 dark:text-slate-400"
                      }`}>
                        <Quote className={`mt-0.5 h-4 w-4 shrink-0 opacity-50 ${isFair ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                        <span>{clause.exactQuote}</span>
                      </blockquote>

                      {!isFair && clause.proposedAmendment && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                              <Wrench className="h-4 w-4 shrink-0" /> Fairer wording
                            </span>
                            <button
                              onClick={() => handleCopy(clause.id, clause.proposedAmendment)}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-white/10"
                            >
                              {copiedId === clause.id ? (
                                <>
                                  <Check className="h-4 w-4 shrink-0 text-emerald-600" /> <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 shrink-0" /> <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="font-mono text-sm leading-relaxed text-emerald-950 dark:text-emerald-100">
                            &ldquo;{clause.proposedAmendment}&rdquo;
                          </p>
                        </div>
                      )}

                      {clause.legalContextNote && (
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Legal context: </span>
                          {clause.legalContextNote}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      onClick={() => toggleOpen(clause.id)}
                      aria-expanded={isOpen}
                      className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      <span>{isOpen ? "Less" : isFair ? "Details" : "Details & fix"}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => handleLocate(clause)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-white/10"
                    >
                      <MapPin className="h-4 w-4 shrink-0" /> Locate
                    </button>
                    <span className="flex-1" />
                    {isFair ? (
                      <span className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> Safe term
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleClauseForNegotiation(clause.id)}
                        aria-pressed={isPush}
                        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition ${
                          isPush
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        }`}
                      >
                        {isPush ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                        <span>{isPush ? "Pushing back" : "Push back"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Sticky action bar */}
      {pushCount > 0 && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10">
          <div className="anim-rise pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white/90 p-2.5 pl-4 shadow-xl backdrop-blur dark:border-indigo-400/30 dark:bg-[#14121f]/90">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-indigo-500" /> {pushCount} clause
              {pushCount === 1 ? "" : "s"} to push back on
            </span>
            <button onClick={() => setIsNegotiationOpen(true)} className="cc-btn-primary h-10 whitespace-nowrap">
              <Send className="h-4 w-4 shrink-0" /> <span className="whitespace-nowrap">Draft counter-offer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
