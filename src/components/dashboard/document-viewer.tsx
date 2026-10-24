"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useAuditStore } from "../../store/use-audit-store";
import { AnalyzedClause, ClauseSeverity } from "../../lib/schema";
import { flashMark } from "../../lib/flash";

interface TextSegment {
  type: "text" | "highlight";
  content: string;
  clause?: AnalyzedClause;
}

export function DocumentViewer() {
  const { rawText, auditResult, selectedClauseId, setSelectedClauseId, setActiveTab } =
    useAuditStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  // Scroll to + flash the selected clause mark
  useEffect(() => {
    if (selectedClauseId) flashMark(selectedClauseId);
  }, [selectedClauseId]);

  // Compute text segments by locating verbatim exactQuotes in rawText
  const segments: TextSegment[] = useMemo(() => {
    if (!rawText) return [];
    if (!auditResult || !auditResult.clauses || auditResult.clauses.length === 0) {
      return [{ type: "text", content: rawText }];
    }

    interface MatchInterval {
      start: number;
      end: number;
      clause: AnalyzedClause;
    }

    const matches: MatchInterval[] = [];

    for (const clause of auditResult.clauses) {
      if (!clause.exactQuote) continue;

      const quote = clause.exactQuote.trim();
      let pos = rawText.indexOf(quote);

      if (pos === -1) {
        pos = rawText.toLowerCase().indexOf(quote.toLowerCase());
      }

      if (pos !== -1) {
        matches.push({ start: pos, end: pos + quote.length, clause });
      }
    }

    if (matches.length === 0) {
      return [{ type: "text", content: rawText }];
    }

    matches.sort((a, b) => a.start - b.start);

    const nonOverlapping: MatchInterval[] = [];
    let lastEnd = -1;

    for (const m of matches) {
      if (m.start >= lastEnd) {
        nonOverlapping.push(m);
        lastEnd = m.end;
      }
    }

    const result: TextSegment[] = [];
    let cursor = 0;

    for (const m of nonOverlapping) {
      if (m.start > cursor) {
        result.push({ type: "text", content: rawText.slice(cursor, m.start) });
      }

      result.push({
        type: "highlight",
        content: rawText.slice(m.start, m.end),
        clause: m.clause,
      });

      cursor = m.end;
    }

    if (cursor < rawText.length) {
      result.push({ type: "text", content: rawText.slice(cursor) });
    }

    return result;
  }, [rawText, auditResult]);

  const handleMarkClick = (clause: AnalyzedClause) => {
    setSelectedClauseId(clause.id);
    setActiveTab("clauses");
    const cardEl = document.getElementById(`card-${clause.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const getMarkClasses = (severity: ClauseSeverity, isSelected: boolean) => {
    const base =
      "cursor-pointer rounded-[4px] px-0.5 py-px border-b-2 transition-colors duration-150 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
    const sel = isSelected ? " ring-2 ring-indigo-500" : "";

    switch (severity) {
      case "critical":
        return `${base}${sel} bg-rose-100 border-rose-400 text-rose-950 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30`;
      case "warning":
        return `${base}${sel} bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30`;
      case "fair":
        return `${base}${sel} bg-emerald-100 border-emerald-400 text-emerald-950 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30`;
      default:
        return `${base}${sel} bg-slate-200 border-slate-400 text-slate-900 dark:bg-white/10 dark:text-slate-100`;
    }
  };

  const fontSizes = {
    sm: "text-sm leading-relaxed",
    base: "text-base leading-loose",
    lg: "text-lg leading-loose",
  };

  return (
    <div className="cc-card flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-2.5 sm:px-6 dark:border-white/10">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-display text-base font-bold whitespace-nowrap">Original contract</h2>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {auditResult?.clauses?.length || 0}&nbsp;marked
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3 pr-1 sm:pr-0">
          <div className="hidden shrink-0 items-center gap-2.5 text-xs font-semibold text-slate-500 md:flex dark:text-slate-400">
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />Red flag
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />Warning
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />Safe term
            </span>
          </div>

          <div className="cc-seg shrink-0" role="group" aria-label="Text size">
            {(["sm", "base", "lg"] as const).map((s, i) => (
              <button
                key={s}
                data-active={fontSize === s}
                onClick={() => setFontSize(s)}
                aria-label={`Text size ${s}`}
                className="cc-seg-item !min-h-[28px] !px-2.5 !text-xs"
              >
                <span style={{ fontSize: 11 + i * 2 }}>A</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Paper */}
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-slate-100/70 p-3 sm:p-6 dark:bg-black/20">
        <article className="font-paper relative mx-auto max-w-2xl whitespace-pre-wrap rounded-xl border border-slate-200 bg-[#fffdf8] p-6 text-slate-800 shadow-[0_2px_4px_rgb(20_18_40/0.05),0_24px_48px_-24px_rgb(20_18_40/0.25)] sm:p-10 dark:border-white/10 dark:bg-[#14121c] dark:text-slate-200 dark:shadow-none">
          <div className={fontSizes[fontSize]}>
            {segments.map((seg, idx) => {
              if (seg.type === "text") {
                return <span key={idx}>{seg.content}</span>;
              }

              const clause = seg.clause!;
              const isSelected = selectedClauseId === clause.id;

              return (
                <mark
                  key={idx}
                  id={`doc-${clause.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${clause.severity} clause: ${clause.plainEnglishSummary}`}
                  onClick={() => handleMarkClick(clause)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleMarkClick(clause);
                    }
                  }}
                  title={clause.plainEnglishSummary}
                  className={getMarkClasses(clause.severity, isSelected)}
                >
                  {seg.content}
                </mark>
              );
            })}
          </div>

          <p className="mt-12 border-t border-slate-200 pt-5 text-center font-sans text-xs text-slate-400 dark:border-white/10">
            [End of contract]
          </p>
        </article>
      </div>

      <div className="border-t border-slate-200/80 px-4 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        Tip: click any highlight to jump to its explanation.
      </div>
    </div>
  );
}
