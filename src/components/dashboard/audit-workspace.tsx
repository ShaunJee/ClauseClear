"use client";

import React, { useEffect } from "react";
import { FileSearch, DollarSign, Send, ArrowLeft } from "lucide-react";
import { useAuditStore } from "../../store/use-audit-store";
import { ScoreHeader } from "./score-header";
import { DocumentViewer } from "./document-viewer";
import { ClauseFeed } from "./clause-feed";
import { TrueCostSimulator } from "./true-cost-sim";
import { NegotiationDrawer } from "./negotiation-drawer";

export function AuditWorkspace({ onBackToUpload }: { onBackToUpload?: () => void }) {
  const {
    auditResult,
    activeTab,
    setActiveTab,
    setIsNegotiationOpen,
    selectedClauseIdsForNegotiation,
  } = useAuditStore();

  // When a contract audit is loaded or shown, always scroll to the top and default to Review view
  useEffect(() => {
    setActiveTab("clauses");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [auditResult?.contractTitle, setActiveTab]);

  if (!auditResult) return null;

  const pushCount = selectedClauseIdsForNegotiation.length;

  return (
    <div className="flex w-full flex-1 flex-col">
      <ScoreHeader />

      {/* Sticky tab bar */}
      <div className="sticky top-16 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#09080f]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            {onBackToUpload && (
              <button
                onClick={onBackToUpload}
                aria-label="Back to contract input"
                title="Back to contract input"
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="cc-seg" role="tablist" aria-label="Audit views">
              <button
                role="tab"
                aria-selected={activeTab === "clauses"}
                data-active={activeTab === "clauses"}
                onClick={() => setActiveTab("clauses")}
                className="cc-seg-item"
              >
                <FileSearch className="h-4 w-4" />
                <span>Review</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "true_cost"}
                data-active={activeTab === "true_cost"}
                onClick={() => setActiveTab("true_cost")}
                className="cc-seg-item"
              >
                <DollarSign className="h-4 w-4" />
                <span>True cost</span>
              </button>
            </div>
          </div>

          <button onClick={() => setIsNegotiationOpen(true)} className="cc-btn-primary h-10 whitespace-nowrap">
            <Send className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Counter-offer</span>
            {pushCount > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-white/25 px-1.5 text-xs font-bold">
                {pushCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
        {activeTab === "clauses" && (
          <div className="grid grid-cols-1 gap-6 lg:h-[calc(100vh-15rem)] lg:min-h-[640px] lg:grid-cols-2">
            <div className="h-[70vh] min-h-[420px] lg:h-full">
              <DocumentViewer />
            </div>
            <div className="h-[80vh] min-h-[480px] lg:h-full">
              <ClauseFeed />
            </div>
          </div>
        )}

        {activeTab === "true_cost" && <TrueCostSimulator />}
      </main>

      <NegotiationDrawer />
    </div>
  );
}
