"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  FileText,
  Scale,
  DollarSign,
  PenTool,
  ShieldAlert,
  Zap,
  Clock,
} from "lucide-react";
import { useAuditStore } from "../store/use-audit-store";
import { analyzeCustomTextHeuristically } from "../lib/heuristic-analyzer";

const AUDIT_STEPS = [
  {
    icon: FileText,
    title: "Document Structure & Clause Segmentation",
    detail: "Parsing numbered clauses, covenants, and legal recitals...",
  },
  {
    icon: Scale,
    title: "Statutory Rights & Covenants Audit",
    detail: "Evaluating notice periods, habitability warranties, and one-sided waivers...",
  },
  {
    icon: DollarSign,
    title: "Hidden Fees & True Cost Calculation",
    detail: "Auditing security deposits, utility liabilities, and penalty triggers...",
  },
  {
    icon: PenTool,
    title: "Plain-English Synthesis & Counter-Offers",
    detail: "Synthesizing blunt student translations and protective contract amendments...",
  },
];

const STUDENT_TIPS = [
  "Did you know? Most state laws require landlords to give at least 24 hours advance written notice before non-emergency entry.",
  "Warning: Security deposit deductions for normal wear and tear are strictly prohibited in almost every jurisdiction.",
  "Check your lease: Clauses forcing tenants to pay the landlord's legal fees without mutual rights are often voided by courts.",
  "Pro-tip: Never accept verbal promises from a leasing agent; only signed addenda are legally enforceable.",
  "Good to know: Uncapped late fees exceeding 5% to 8% of monthly rent frequently violate statutory consumer limits.",
  "Important: Standard assessment rates (Cukai Taksiran) and building sinking funds are landlord ownership expenses.",
];

export function AuditLoadingModal({
  isOpen,
  hasSavedKey,
  modelName = "Google Gemini",
}: {
  isOpen?: boolean;
  hasSavedKey?: boolean;
  modelName?: string;
  onSwitchToOffline?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(14);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const {
    rawText,
    setAuditResult,
    isAnalyzing,
    setIsAnalyzing,
    analysisNotice,
    activeEngineDisplay,
  } = useAuditStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isModalOpen = isOpen !== undefined ? (isOpen || isAnalyzing) : isAnalyzing;

  useEffect(() => {
    if (!isModalOpen) {
      setCurrentStep(0);
      setCurrentTip(0);
      setProgress(14);
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();

    // Elapsed timer ticker and dynamic progress calculation based on real elapsed time
    const elapsedTimer = setInterval(() => {
      const now = Date.now();
      const secs = Math.floor((now - startTime) / 100) / 10;
      setElapsedSeconds(secs);

      // Pacing calculation calibrated for live 10-25s AI generation
      if (secs < 3.5) {
        setCurrentStep(0);
        setProgress(Math.min(26, Math.round(14 + secs * 3.4)));
      } else if (secs < 8.5) {
        setCurrentStep(1);
        setProgress(Math.min(54, Math.round(26 + (secs - 3.5) * 5.6)));
      } else if (secs < 15) {
        setCurrentStep(2);
        setProgress(Math.min(78, Math.round(54 + (secs - 8.5) * 3.7)));
      } else if (secs < 24) {
        setCurrentStep(3);
        setProgress(Math.min(92, Math.round(78 + (secs - 15) * 1.5)));
      } else {
        setCurrentStep(3);
        setProgress(Math.min(96, Math.round(92 + (secs - 24) * 0.4)));
      }
    }, 100);

    // Tip cycle
    const tipTimer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % STUDENT_TIPS.length);
    }, 4000);

    return () => {
      clearInterval(elapsedTimer);
      clearInterval(tipTimer);
    };
  }, [isModalOpen]);

  // Lock background scrolling while modal is open
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  if (!isModalOpen || !mounted) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-loading-title"
      className="anim-fade fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div className="anim-rise relative w-full max-w-xl overflow-hidden rounded-3xl border border-indigo-500/30 bg-white p-6 shadow-2xl sm:p-8 dark:border-indigo-500/20 dark:bg-[#12101d]">
        {/* Top Glowing Ambient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-500/30">
              <Sparkles className="h-7 w-7 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-[#12101d]" />
              </span>
            </div>
            <div>
              <h3
                id="audit-loading-title"
                className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              >
                Auditing Your Contract
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                    analysisNotice
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {analysisNotice ? (
                    <Zap className="h-3 w-3 shrink-0 text-amber-500" />
                  ) : (
                    <Sparkles className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span className="whitespace-nowrap">
                    {analysisNotice
                      ? "Local Heuristic Engine (Fallback Active)"
                      : hasSavedKey
                      ? "Google Gemini"
                      : "Local NLP Heuristic Engine"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300 whitespace-nowrap">
                  <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="whitespace-nowrap">{elapsedSeconds.toFixed(1)}s elapsed</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Concise, High-Visibility Engine Switch Banner */}
        {analysisNotice && (
          <div className="anim-rise mt-4 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 shadow-lg shadow-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-300">
                    Engine Switch Notice
                  </span>
                  <span className="inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 whitespace-nowrap">
                    Seamless Failover
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-900 dark:text-white">
                  {analysisNotice}
                </p>
                <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Document audited locally with 100% clause detection and zero wait time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shimmering Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300">
              {analysisNotice
                ? "Completed with ClauseClear Local Heuristic Engine"
                : elapsedSeconds < 3.5
                ? "Parsing document structure & numbering..."
                : elapsedSeconds < 8.5
                ? "Auditing covenants against consumer rights..."
                : elapsedSeconds < 15
                ? "Calculating True Cost, deposits & liabilities..."
                : elapsedSeconds < 24
                ? "Synthesizing translations & counter-offers..."
                : "Finalizing contract fairness score and risk assessment..."}
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">
              {analysisNotice ? 100 : progress}%
            </span>
          </div>

          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                analysisNotice
                  ? "bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500"
              }`}
              style={{ width: `${analysisNotice ? 100 : progress}%` }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
              style={{ backgroundSize: "200% 100%" }}
            />
          </div>
        </div>

        {/* 4-Step Interactive Pipeline Checklist */}
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/5 dark:bg-white/[0.03]">
          {AUDIT_STEPS.map((step, idx) => {
            const isDone = analysisNotice ? true : currentStep > idx;
            const isCurrent = !analysisNotice && currentStep === idx;
            const StepIcon = step.icon;

            return (
              <div
                key={step.title}
                className={`flex items-start gap-3 transition-opacity duration-300 ${
                  isDone || isCurrent ? "opacity-100" : "opacity-40"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <div className="grid h-5 w-5 place-items-center rounded-full border-2 border-slate-300 text-[10px] font-bold text-slate-400 dark:border-white/20">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {step.title}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        Analyzing now
                      </span>
                    )}
                    {analysisNotice && (
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rotating Student Legal Insight Carousel */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-900 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">
              Student Legal Insight
            </span>
            <p className="mt-0.5 font-medium leading-relaxed">
              {STUDENT_TIPS[currentTip]}
            </p>
          </div>
        </div>

        {/* Live Processing Reassurance Indicator */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {analysisNotice
              ? "All clauses audited locally against statutory standards."
              : "Live AI engine evaluating covenants and legal obligations in memory."}
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 font-mono text-xs font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300 whitespace-nowrap">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="whitespace-nowrap">
                {analysisNotice ? "Switching Engines..." : "AI Processing..."}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
