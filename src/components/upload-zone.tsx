"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Sparkles,
  ArrowRight,
  Zap,
  Home,
  Briefcase,
  Dumbbell,
  Lock,
} from "lucide-react";
import { useAuditStore } from "../store/use-audit-store";
import { SAMPLE_PRESET_LIST } from "../lib/sample-contracts";
import { analyzeCustomTextHeuristically } from "../lib/heuristic-analyzer";

const PRESET_STYLE: Record<string, { icon: typeof Home; tile: string; tag: string }> = {
  "slumlord-lease": { icon: Home, tile: "from-rose-500 to-orange-400", tag: "Off-campus lease" },
  "internship-trap": { icon: Briefcase, tile: "from-violet-500 to-fuchsia-500", tag: "Internship offer" },
};

const DEFAULT_STYLE = { icon: Dumbbell, tile: "from-emerald-500 to-teal-400", tag: "Gym membership" };

export function UploadZone({ onAuditComplete }: { onAuditComplete?: () => void }) {
  const {
    loadPreset,
    setRawText,
    setAuditResult,
    isAnalyzing,
    analysisError,
    setIsAnalyzing,
    setAnalysisError,
    setAnalysisNotice,
    setActiveEngineDisplay,
  } = useAuditStore();

  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = () => {
      if (typeof window !== "undefined") {
        setHasSavedKey(!!localStorage.getItem("clauseclear_gemini_key"));
      }
    };
    checkKey();
    window.addEventListener("storage", checkKey);
    return () => window.removeEventListener("storage", checkKey);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFileSelected(e.target.files[0]);
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFileName(file.name);
    if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const text = await file.text();
      setPastedText(text);
      setInputMode("paste");
      return;
    }

    setAnalysisError(null);
    setAnalysisNotice(null);
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setAnalysisError("Could not read that file. Please try another one.");
      setIsAnalyzing(false);
    };
    reader.onload = async () => {
      const base64String = (reader.result as string).split(",")[1];
      setIsAnalyzing(false);
      await executeAnalysis({ fileBase64: base64String, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const executeAnalysis = async (payload: {
    contractText?: string;
    fileBase64?: string;
    mimeType?: string;
    presetId?: string;
  }) => {
    if (useAuditStore.getState().isAnalyzing) return;

    const startedAt = Date.now();

    setAnalysisError(null);
    setAnalysisNotice(null);
    setIsAnalyzing(true);

    let userApiKey = "";
    if (typeof window !== "undefined") {
      userApiKey = localStorage.getItem("clauseclear_gemini_key") || "";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {}),
        },
        body: JSON.stringify({ ...payload, userApiKey }),
      });

      if (!res.ok) throw new Error(`Analyze request failed (${res.status}).`);

      const auditData = await res.json();

      if (auditData.quotaNotice) {
        setAnalysisNotice(auditData.quotaNotice);
        setActiveEngineDisplay("Local Heuristic Engine (Fallback Active)");
        await sleep(2500);
      } else {
        setAnalysisNotice(null);
        setActiveEngineDisplay("Google Gemini");
        const elapsed = Date.now() - startedAt;
        await sleep(Math.max(600, 1800 - elapsed));
      }

      if (payload.contractText) setRawText(payload.contractText);
      setAuditResult(auditData);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      onAuditComplete?.();
    } catch (err: any) {
      console.warn("Analysis error, using heuristic or preset fallback:", err);

      if (payload.presetId) {
        await sleep(500);
        loadPreset(payload.presetId);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        onAuditComplete?.();
      } else if (payload.contractText) {
        const fallbackAudit = analyzeCustomTextHeuristically(payload.contractText);
        const name = err?.name;
        const msg = String(err?.message || "");
        const notice =
          name === "AbortError"
            ? "Google AI took too long to respond. Seamlessly analyzed with ClauseClear Local Heuristic Engine."
            : name === "TypeError" || msg.includes("Failed to fetch") || msg.includes("NetworkError")
            ? "Local server connection interrupted. Seamlessly analyzed with ClauseClear Local Heuristic Engine."
            : "Google AI service unavailable or rate limit reached. Seamlessly analyzed with ClauseClear Local Heuristic Engine.";

        fallbackAudit.quotaNotice = notice;
        setAnalysisNotice(notice);
        setActiveEngineDisplay("Local Heuristic Engine (Fallback Active)");
        await sleep(2500);
        setRawText(payload.contractText);
        setAuditResult(fallbackAudit);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        onAuditComplete?.();
      } else {
        setAnalysisError(
          "We could not analyze that file right now. Try again, or paste the contract text instead."
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzePasted = () => {
    const text = pastedText.trim();
    if (!text || useAuditStore.getState().isAnalyzing) return;
    executeAnalysis({ contractText: text });
  };

  const handleSelectPreset = async (presetId: string) => {
    if (useAuditStore.getState().isAnalyzing) return;
    setAnalysisNotice(null);
    setIsAnalyzing(true);
    try {
      await sleep(750);
      loadPreset(presetId);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      onAuditComplete?.();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const wordCount = pastedText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-14">
      {/* Sample presets */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="cc-label flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Zap className="h-4 w-4" /> Instant demo
          </p>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            Start with a real-world trap.
          </h2>
          <p className="max-w-xl text-slate-600 dark:text-slate-400">
            Three realistic contracts, pre-loaded. One click, zero setup.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {SAMPLE_PRESET_LIST.map((preset, i) => {
            const style = PRESET_STYLE[preset.id] || DEFAULT_STYLE;
            const Icon = style.icon;

            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className="cc-card anim-rise group flex flex-col p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl dark:hover:border-indigo-400/40"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${style.tile} text-white shadow-lg`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {preset.advertisedPriceDisplay}
                  </span>
                </div>

                <p className="cc-label mt-5">{style.tag}</p>
                <h3 className="font-display mt-1 text-xl font-bold">{preset.name}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {preset.tagline}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  Run audit <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span className="cc-label">or audit your own</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      {/* Custom contract */}
      <div id="paste" className="cc-card scroll-mt-24 space-y-5 p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-xl font-bold">Your contract</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Paste the text, or upload a PDF, photo or .txt.
            </p>
          </div>

          <div className="cc-seg self-start" role="tablist" aria-label="Input method">
            <button
              role="tab"
              aria-selected={inputMode === "paste"}
              data-active={inputMode === "paste"}
              onClick={() => setInputMode("paste")}
              className="cc-seg-item"
            >
              Paste text
            </button>
            <button
              role="tab"
              aria-selected={inputMode === "upload"}
              data-active={inputMode === "upload"}
              onClick={() => setInputMode("upload")}
              className="cc-seg-item"
            >
              Upload file
            </button>
          </div>
        </div>

        {inputMode === "paste" ? (
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="contract-text" className="sr-only">
                Contract text
              </label>
              <textarea
                id="contract-text"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste any lease, offer letter or membership terms here… e.g. “Landlord may enter at any time. Tenant pays the first $350 of repairs. Rent is $950/mo plus $45 portal fee.”"
                rows={9}
                className="cc-input resize-y p-4 pb-9 leading-relaxed"
              />
              <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-xs text-slate-400">
                {wordCount} words
              </span>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Lock className="h-3.5 w-3.5 shrink-0" /> In-memory analysis (never stored).
                </span>
                {hasSavedKey ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                    <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="whitespace-nowrap">Engine: Google Gemini Live AI</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 whitespace-nowrap">
                    <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="whitespace-nowrap">Engine: Local NLP (Offline)</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAnalyzePasted}
                disabled={!pastedText.trim() || isAnalyzing}
                className="cc-btn-primary h-12 px-6 whitespace-nowrap inline-flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="whitespace-nowrap">Reading the fine print…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Audit my contract</span>
                  </>
                )}
              </button>
            </div>

            {analysisError && (
              <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
                {analysisError}
              </p>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a contract file"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition sm:p-14 ${dragActive
              ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10"
              : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 dark:border-white/15 dark:bg-white/[0.03]"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />

            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <UploadCloud className="h-8 w-8" />
            </span>

            <div>
              <p className="font-display text-lg font-bold">
                {selectedFileName ? (
                  <span className="text-indigo-600 dark:text-indigo-300">
                    {selectedFileName}
                  </span>
                ) : (
                  "Drop your lease or agreement here"
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                PDF, PNG/JPG scans, or .txt, or click to browse
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
