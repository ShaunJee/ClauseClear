"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  FileSearch,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuditStore } from "../store/use-audit-store";
import { Navbar } from "../components/navbar";
import { UploadZone } from "../components/upload-zone";
import { AuditWorkspace } from "../components/dashboard/audit-workspace";
import { AuditLoadingModal } from "../components/audit-loading-modal";

function HeroPreview() {
  return (
    <div
      aria-hidden="true"
      className="anim-rise relative mx-auto w-full max-w-md"
      style={{ animationDelay: "250ms" }}
    >
      <div className="cc-card relative rotate-1 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="38"
                strokeWidth="9"
                className="fill-none stroke-slate-100 dark:stroke-white/10"
              />
              <circle
                cx="48"
                cy="48"
                r="38"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="238.76"
                strokeDashoffset="184"
                className="fill-none stroke-rose-500"
              />
            </svg>
            <div className="font-display absolute inset-0 grid place-items-center text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              23
            </div>
          </div>
          <div>
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
              Predatory / High Risk
            </span>
            <p className="font-display mt-1.5 text-lg font-bold leading-tight">
              Off-Campus Lease
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">7 red flags found</p>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          {[88, 100, 72].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className={`h-8 w-1.5 rounded-full ${i === 2 ? "bg-amber-400" : "bg-rose-500"}`}
              />
              <div className="flex-1 space-y-1.5">
                <div
                  className="h-2.5 rounded-full bg-slate-200 dark:bg-white/15"
                  style={{ width: `${w}%` }}
                />
                <div
                  className="h-2 rounded-full bg-slate-100 dark:bg-white/10"
                  style={{ width: `${w - 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="anim-float cc-card absolute -left-4 -top-5 flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold sm:-left-10"
        style={{ ["--r" as any]: "-4deg" }}
      >
        <AlertTriangle className="h-4 w-4 text-rose-500" /> Entry at 3 AM, no notice
      </div>
      <div
        className="anim-float cc-card absolute -right-3 top-24 flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold sm:-right-10"
        style={{ ["--r" as any]: "3deg", animationDelay: "-2s" }}
      >
        <DollarSign className="h-4 w-4 text-amber-500" /> +$1,260/yr hidden
      </div>
      <div
        className="anim-float cc-card absolute -bottom-5 left-8 flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold"
        style={{ ["--r" as any]: "-2deg", animationDelay: "-4s" }}
      >
        <Send className="h-4 w-4 text-emerald-500" /> Counter-offer ready
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: FileSearch,
    title: "Input your contract",
    body: "Paste text or choose a realistic preset. Nothing is stored.",
  },
  {
    icon: AlertTriangle,
    title: "See the traps instantly",
    body: "Every risky clause is highlighted and translated into plain English.",
  },
  {
    icon: Send,
    title: "Push back politely",
    body: "One click drafts a counter-offer email and a signable Rider.",
  },
];

export default function HomePage() {
  const { auditResult, isAnalyzing, activeEngineDisplay } = useAuditStore();
  const [viewMode, setViewMode] = useState<"landing" | "workspace">("landing");
  const [hasSavedKey, setHasSavedKey] = useState(false);

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

  const inWorkspace = viewMode === "workspace" && !!auditResult;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        inWorkspace={inWorkspace}
        onOpenUpload={() => {
          setViewMode(viewMode === "workspace" ? "landing" : "workspace");
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }}
        onSelectSample={() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          setViewMode("workspace");
        }}
        onHomeClick={() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          setViewMode("landing");
        }}
      />

      {inWorkspace ? (
        <AuditWorkspace
          onBackToUpload={() => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            setViewMode("landing");
          }}
        />
      ) : (
        <main id="main" className="flex flex-1 flex-col">
          {/* Hero */}
          <section className="relative overflow-hidden">
            <div className="aurora" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:px-8">
              <div className="space-y-7">
                <span className="anim-rise inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-indigo-700 backdrop-blur dark:border-indigo-400/30 dark:bg-white/5 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4" /> Built for students & first-time renters
                </span>

                <h1
                  className="font-display anim-rise text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl"
                  style={{ animationDelay: "80ms" }}
                >
                  Read the fine print <br />
                  <span className="text-gradient">before it reads you.</span>
                </h1>

                <p
                  className="anim-rise max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300"
                  style={{ animationDelay: "160ms" }}
                >
                  Paste a lease, internship offer or gym contract. ClauseClear flags the traps, adds up the hidden fees, and drafts your counter-offer - in seconds.
                </p>

                <div className="anim-rise flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
                  <a href="#try" className="cc-btn-primary h-12 whitespace-nowrap px-6 text-base">
                    Try a sample contract <ArrowRight className="h-5 w-5 shrink-0" />
                  </a>
                  <a href="#paste" className="cc-btn-ghost h-12 whitespace-nowrap px-6 text-base">
                    Paste my own
                  </a>
                </div>

                <ul
                  className="anim-rise flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600 dark:text-slate-400"
                  style={{ animationDelay: "320ms" }}
                >
                  <li className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Free for students
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-indigo-500" /> Nothing stored
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> No sign-up
                  </li>
                </ul>
              </div>

              <HeroPreview />
            </div>
          </section>

          {/* Try it */}
          <section id="try" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6 lg:px-8">
            <UploadZone
              onAuditComplete={() => {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                setViewMode("workspace");
              }}
            />
          </section>

          {/* How it works */}
          <section className="border-t border-slate-200/70 bg-white/60 py-20 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl space-y-3 text-center">
                <p className="cc-label">How it works</p>
                <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                  Three steps from “huh?” to “deal.”
                </h2>
              </div>

              <ol className="grid gap-5 md:grid-cols-3">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="cc-card relative space-y-3 p-6">
                    <span className="font-display text-gradient absolute right-5 top-4 text-5xl font-extrabold opacity-30">
                      {i + 1}
                    </span>
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-lg font-bold">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {s.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <footer className="border-t border-slate-200/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            <p>
              <strong className="font-semibold text-slate-700 dark:text-slate-300">
                Responsible AI:
              </strong>{" "}
              ClauseClear is an educational transparency project, not legal counsel. Check with your university&apos;s student legal services before signing.
            </p>
          </footer>
        </main>
      )}

      <AuditLoadingModal
        isOpen={isAnalyzing}
        hasSavedKey={hasSavedKey}
        modelName={activeEngineDisplay || "Google Gemini"}
      />
    </div>
  );
}
