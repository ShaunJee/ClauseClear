"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Zap,
  Key,
  Check,
  X,
  Sun,
  Moon,
  ChevronDown,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Trash2,
  Cpu,
} from "lucide-react";
import { useAuditStore } from "../store/use-audit-store";
import { SAMPLE_PRESET_LIST } from "../lib/sample-contracts";

export function Navbar({
  onOpenUpload,
  inWorkspace,
  onSelectSample,
  onHomeClick,
}: {
  onOpenUpload?: () => void;
  inWorkspace?: boolean;
  onSelectSample?: () => void;
  onHomeClick?: () => void;
}) {
  const { activePresetId, loadPreset, setIsAnalyzing } = useAuditStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("clauseclear_theme");
      if (storedTheme === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }

      const storedKey = localStorage.getItem("clauseclear_gemini_key");
      if (storedKey) {
        setApiKeyInput(storedKey);
        setHasSavedKey(true);
      }
    }
  }, []);

  // Listen for storage changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        const storedKey = localStorage.getItem("clauseclear_gemini_key");
        if (storedKey) {
          setApiKeyInput(storedKey);
          setHasSavedKey(true);
        } else {
          setApiKeyInput("");
          setHasSavedKey(false);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Close menu / modal on outside click + Escape
  useEffect(() => {
    if (!menuOpen && !isKeyModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuOpen && !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setIsKeyModalOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, isKeyModalOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("clauseclear_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      setTestStatus("error");
      setTestMessage("Please enter an API key to test.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Connecting to Google Gemini API...");

    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus("success");
        setTestMessage(data.message || "Connection verified! Ready for live AI audits.");
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Failed to verify key with Google Gemini API.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.message || "Network error while connecting to Google AI.");
    }
  };

  const handleSaveKey = () => {
    if (typeof window !== "undefined") {
      if (apiKeyInput.trim()) {
        localStorage.setItem("clauseclear_gemini_key", apiKeyInput.trim());
        setHasSavedKey(true);
      } else {
        localStorage.removeItem("clauseclear_gemini_key");
        setHasSavedKey(false);
      }
      window.dispatchEvent(new Event("storage"));
    }
    setIsKeyModalOpen(false);
    setTestStatus("idle");
    setTestMessage("");
  };

  const handleRemoveKey = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("clauseclear_gemini_key");
      window.dispatchEvent(new Event("storage"));
    }
    setApiKeyInput("");
    setHasSavedKey(false);
    setTestStatus("idle");
    setTestMessage("");
  };

  const getMaskedKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-[#09080f]/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <a
            href="/"
            onClick={(e) => {
              if (onHomeClick) {
                e.preventDefault();
                onHomeClick();
              }
            }}
            className="flex items-center gap-2.5"
            aria-label="ClauseClear home"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-lg shadow-indigo-500/30"
              style={{
                backgroundImage: "linear-gradient(135deg,#5b4bff,#8b5cf6 55%,#d946ef)",
              }}
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              Clause<span className="text-gradient">Clear</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            {/* Samples menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="cc-btn-ghost h-10 whitespace-nowrap inline-flex items-center"
              >
                <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="whitespace-nowrap">Samples</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="anim-fade absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#14121f]"
                >
                  <p className="cc-label px-3 pb-1.5 pt-2">Instant demo audits</p>
                  {SAMPLE_PRESET_LIST.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        role="menuitem"
                        onClick={async () => {
                          setMenuOpen(false);
                          setIsAnalyzing(true);
                          await new Promise((r) => setTimeout(r, 650));
                          loadPreset(preset.id);
                          setIsAnalyzing(false);
                          if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                          onSelectSample?.();
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        <span className="truncate">{preset.name}</span>
                        {isActive && (
                          <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {inWorkspace && onOpenUpload && (
              <button onClick={onOpenUpload} className="cc-btn-ghost h-10 whitespace-nowrap inline-flex items-center">
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Audit another</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>

            <button
              onClick={() => {
                setTestStatus("idle");
                setTestMessage("");
                setIsKeyModalOpen(true);
              }}
              aria-label="AI engine settings"
              title="AI engine settings"
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Key
                className={`h-4 w-4 shrink-0 ${
                  hasSavedKey ? "text-emerald-500" : "text-amber-500"
                }`}
              />
              <span className="whitespace-nowrap">
                {hasSavedKey ? "Gemini AI" : "Offline mode"}
              </span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  hasSavedKey
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* AI Engine & API Key Modal */}
      {isKeyModalOpen && (
        <div
          className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsKeyModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="key-title"
            className="anim-rise w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#14121f]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Key className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="key-title" className="font-display text-lg font-bold leading-none">
                    AI Engine Settings
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Dual engine: Local Heuristic NLP or Google Gemini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current Engine Status Card */}
            <div
              className={`rounded-2xl border p-4 transition ${
                hasSavedKey
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                  : "border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      hasSavedKey
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    }`}
                  >
                    {hasSavedKey ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <Cpu className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {hasSavedKey ? "Google Gemini" : "Local NLP Heuristic Engine"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                          hasSavedKey
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                        }`}
                      >
                        {hasSavedKey ? "Live AI Active" : "Offline Active"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {hasSavedKey
                        ? `Custom key configured (${getMaskedKey(
                            apiKeyInput
                          )}). Used for structured audits and counter-offers.`
                        : "Zero-API-key mode. 25+ pattern rules analyze leases, internships, and memberships locally."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="gemini-key-input" className="cc-label">
                  Google Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
                >
                  <span>Get free key</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  id="gemini-key-input"
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (testStatus !== "idle") setTestStatus("idle");
                  }}
                  className="cc-input pr-20 font-mono text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide key" : "Show key"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Your key stays strictly inside your browser localStorage and is sent securely to Google Gemini for legal auditing. It is never stored on our database.
              </p>
            </div>

            {/* Test Status Banner */}
            {testStatus !== "idle" && (
              <div
                className={`anim-rise flex items-start gap-2.5 rounded-2xl border p-3 text-xs ${
                  testStatus === "testing"
                    ? "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300"
                    : testStatus === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                }`}
              >
                {testStatus === "testing" && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600 dark:text-sky-400" />
                )}
                {testStatus === "success" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                )}
                {testStatus === "error" && (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <div className="flex-1 font-medium">{testMessage}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div>
                {hasSavedKey && (
                  <button
                    type="button"
                    onClick={handleRemoveKey}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30 whitespace-nowrap"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">Remove key</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={!apiKeyInput.trim() || testStatus === "testing"}
                  className="cc-btn-ghost h-9 px-3 text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  {testStatus === "testing" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="whitespace-nowrap">Testing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span className="whitespace-nowrap">Test key</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="cc-btn-ghost h-9 px-3 text-xs whitespace-nowrap inline-flex items-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="cc-btn-primary h-9 px-4 text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">Save & Activate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
