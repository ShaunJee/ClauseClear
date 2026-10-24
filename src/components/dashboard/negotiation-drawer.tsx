"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Copy,
  Check,
  Mail,
  Sparkles,
  FileText,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react";
import { useAuditStore } from "../../store/use-audit-store";
import { NegotiationTone } from "../../lib/schema";
import { generateDeterministicNegotiation } from "../../lib/negotiation-generator";
import { callGeminiNegotiateDirectly } from "../../lib/gemini-browser";

const TONES: { id: NegotiationTone; title: string; badge: string; blurb: string }[] = [
  {
    id: "polite_student",
    title: "Collaborative",
    badge: "Recommended",
    blurb: "Friendly, respectful. Frames changes as quick clarifications.",
  },
  {
    id: "firm_tenant",
    title: "Firm",
    badge: "Direct",
    blurb: "Assertive and businesslike. Asks for standard two-way terms.",
  },
  {
    id: "statutory_citation",
    title: "Legal",
    badge: "By the book",
    blurb: "Cites consumer-protection and tenant codes.",
  },
];

function formatEmailWithNewlines(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // If text already has well-structured double newlines between paragraphs, return as is
  if ((text.match(/\n\n/g) || []).length >= 2) {
    return text;
  }

  // 1. Separate salutation ("Dear ... ,") if followed directly by text without double newlines
  text = text.replace(/^(Dear\s+[^,\n]+,)\s*/i, "$1\n\n");

  // 2. Separate common closing regards ("Warm regards,", "Best regards,", "Sincerely,", etc.)
  text = text.replace(
    /\s*([.!?])\s*(Warm regards|Best regards|Kind regards|Sincerely|Respectfully|Thanks and regards|With gratitude),?\s*(.+)?$/i,
    (match, punc, signoff, name) => {
      const cleanName = name ? name.trim() : "";
      return `${punc}\n\n${signoff},\n${cleanName}`;
    }
  );

  // If signoff is still inline (e.g. "Warm regards, Alex Chen")
  text = text.replace(
    /\s*(Warm regards|Best regards|Kind regards|Sincerely|Respectfully|Thanks and regards),\s+([A-Z][a-zA-Z\s()]+)$/i,
    "\n\n$1,\n$2"
  );

  // 3. Separate key paragraph transitions if it was squashed into a single wall of text
  text = text.replace(
    /([.!?])\s+(I have reviewed|To ensure|Specifically,|Specifically\b|I would like to propose|I have attached|Please let me know|Thank you so much)/g,
    "$1\n\n$2"
  );

  return text;
}

export function NegotiationDrawer() {
  const {
    contractTitle,
    auditResult,
    isNegotiationOpen,
    setIsNegotiationOpen,
    selectedClauseIdsForNegotiation,
    toggleClauseForNegotiation,
    negotiationTone,
    setNegotiationTone,
    setGeneratedCounterOffer,
    isGeneratingNegotiation,
    setIsGeneratingNegotiation,
  } = useAuditStore();

  const [counterpartyName, setCounterpartyName] = useState("Leasing Management Team");
  const [userName, setUserName] = useState("Alex Chen (Prospective Tenant)");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [formalAddendum, setFormalAddendum] = useState("");
  const [activeTab, setActiveTab] = useState<"email" | "addendum">("email");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const selectedClauses = (auditResult?.clauses || []).filter((c) =>
    selectedClauseIdsForNegotiation.includes(c.id)
  );

  const triggerConfetti = async () => {
    try {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default || confettiModule;
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
    } catch {
      // Graceful fallback
    }
  };

  const handleGenerate = async (toneToUse = negotiationTone) => {
    setIsGeneratingNegotiation(true);
    let data: any = null;

    try {
      const userApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("clauseclear_gemini_key") || undefined
          : undefined;

      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {}),
        },
        body: JSON.stringify({
          contractTitle: contractTitle || auditResult?.contractTitle || "Agreement",
          selectedClauses,
          tone: toneToUse,
          counterpartyName,
          userName,
          userApiKey,
        }),
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (err) {
      console.warn("Server API negotiate unavailable, attempting client direct or template fallback:", err);
    }

    // If server API was unavailable and user has API key, generate via direct browser Gemini REST call
    const userApiKey =
      typeof window !== "undefined"
        ? localStorage.getItem("clauseclear_gemini_key") || undefined
        : undefined;

    if (!data && userApiKey) {
      try {
        data = await callGeminiNegotiateDirectly({
          apiKey: userApiKey,
          contractTitle: contractTitle || auditResult?.contractTitle || "Agreement",
          selectedClauses,
          tone: toneToUse,
          counterpartyName,
          userName,
        });
      } catch (directAiErr) {
        console.warn("Direct browser Gemini negotiate encountered error, using template:", directAiErr);
      }
    }

    if (!data) {
      data = generateDeterministicNegotiation({
        contractTitle: contractTitle || auditResult?.contractTitle || "Agreement",
        selectedClauses,
        tone: toneToUse,
        counterpartyName,
        userName,
      });
    }

    try {
      const cleanedBody = formatEmailWithNewlines(data.emailBody || "");
      setEmailSubject(data.emailSubject || "Proposed Contract Amendments");
      setEmailBody(cleanedBody);
      setFormalAddendum(data.formalAddendumText || "");
      setGeneratedCounterOffer(cleanedBody);
    } finally {
      setIsGeneratingNegotiation(false);
    }
  };

  useEffect(() => {
    if (isNegotiationOpen) {
      if (emailBody && !emailBody.includes("\n\n")) {
        setEmailBody(formatEmailWithNewlines(emailBody));
      } else if (!emailBody && selectedClauses.length > 0) {
        handleGenerate();
      }
    }
  }, [isNegotiationOpen]);

  useEffect(() => {
    if (!isNegotiationOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNegotiationOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isNegotiationOpen, setIsNegotiationOpen]);

  if (!isNegotiationOpen) return null;

  const handleCopy = (type: "email" | "addendum") => {
    const textToCopy = type === "email" ? `${emailSubject}\n\n${emailBody}` : formalAddendum;
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    triggerConfetti();
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleMailto = () => {
    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(emailBody);
    window.open(`mailto:?subject=${encodedSubject}&body=${encodedBody}`, "_blank");
  };

  const stepNum =
    "grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white";

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setIsNegotiationOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="neg-title"
        className="anim-slide-in flex h-full w-full max-w-2xl flex-col bg-[#fbf9f6] shadow-2xl dark:bg-[#0d0c16]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg shadow-indigo-500/30"
              style={{ backgroundImage: "linear-gradient(135deg,#5b4bff,#8b5cf6 55%,#d946ef)" }}
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 id="neg-title" className="font-display text-lg font-bold leading-tight">
                Counter-offer drafter
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                A polite email plus a signable Rider.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNegotiationOpen(false)}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-7 overflow-y-auto p-5 sm:p-6">
          {/* 1. Tone */}
          <section className="space-y-3">
            <h3 className="font-display flex items-center gap-2 text-base font-bold">
              <span className={stepNum}>1</span> Pick a tone
            </h3>
            <div
              className="grid gap-2.5 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Negotiation tone"
            >
              {TONES.map((t) => {
                const active = negotiationTone === t.id;
                return (
                  <button
                    key={t.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setNegotiationTone(t.id);
                      handleGenerate(t.id);
                    }}
                    className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-indigo-600 bg-white ring-2 ring-indigo-500/30 dark:border-indigo-400 dark:bg-indigo-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {t.title}
                        </span>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {t.badge}
                        </span>
                      </div>
                      <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {t.blurb}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Details */}
          <section className="space-y-3">
            <h3 className="font-display flex items-center gap-2 text-base font-bold">
              <span className={stepNum}>2</span> Who & what
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="cc-label">Send to</span>
                <input
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  className="cc-input"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="cc-label">Your signature</span>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="cc-input"
                />
              </label>
            </div>

            <div>
              <p className="cc-label mb-2">
                Clauses to push back on ({selectedClauses.length})
              </p>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {(auditResult?.clauses || []).map((clause) => {
                  const isChecked = selectedClauseIdsForNegotiation.includes(clause.id);
                  return (
                    <button
                      key={clause.id}
                      onClick={() => toggleClauseForNegotiation(clause.id)}
                      aria-pressed={isChecked}
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        isChecked
                          ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100"
                          : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-transparent"
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{clause.sectionTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Draft */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display flex items-center gap-2 text-base font-bold">
                <span className={stepNum}>3</span> Review & send
              </h3>
              <div className="cc-seg" role="tablist" aria-label="Draft type">
                <button
                  role="tab"
                  aria-selected={activeTab === "email"}
                  data-active={activeTab === "email"}
                  onClick={() => setActiveTab("email")}
                  className="cc-seg-item"
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === "addendum"}
                  data-active={activeTab === "addendum"}
                  onClick={() => setActiveTab("addendum")}
                  className="cc-seg-item"
                >
                  <FileText className="h-4 w-4" /> Rider
                </button>
              </div>
            </div>

            {selectedClauses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/15">
                Pick at least one clause above to generate your draft.
              </p>
            ) : (
              <div className="relative">
                {isGeneratingNegotiation && (
                  <div
                    className="skeleton absolute inset-0 z-10 rounded-xl"
                    aria-label="Drafting"
                  />
                )}
                {activeTab === "email" ? (
                  <div className="space-y-3">
                    <label className="block space-y-1.5">
                      <span className="cc-label">Subject</span>
                      <input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="cc-input font-semibold"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="cc-label">Message</span>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={14}
                        className="cc-input resize-y font-sans leading-relaxed whitespace-pre-wrap"
                      />
                    </label>
                  </div>
                ) : (
                  <textarea
                    aria-label="Formal Rider addendum"
                    value={formalAddendum}
                    onChange={(e) => setFormalAddendum(e.target.value)}
                    rows={18}
                    className="cc-input resize-y font-mono leading-relaxed"
                  />
                )}
              </div>
            )}
          </section>
        </div>

        {/* Sticky footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-white/80 px-5 py-3.5 backdrop-blur dark:border-white/10 dark:bg-[#0d0c16]/80">
          <button
            onClick={() => handleGenerate()}
            disabled={isGeneratingNegotiation || selectedClauses.length === 0}
            className="cc-btn-ghost whitespace-nowrap"
          >
            <RotateCcw
              className={`h-4 w-4 shrink-0 ${isGeneratingNegotiation ? "animate-spin" : ""}`}
            />
            <span>{isGeneratingNegotiation ? "Drafting…" : "Regenerate"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(activeTab)}
              disabled={selectedClauses.length === 0}
              className="cc-btn-ghost whitespace-nowrap"
            >
              {copiedType === activeTab ? (
                <>
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" /> <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 shrink-0" />{" "}
                  <span>Copy {activeTab === "email" ? "email" : "Rider"}</span>
                </>
              )}
            </button>

            {activeTab === "email" && (
              <button
                onClick={handleMailto}
                disabled={!emailBody}
                className="cc-btn-primary whitespace-nowrap"
              >
                <Send className="h-4 w-4 shrink-0" /> <span>Open mail</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
