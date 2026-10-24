import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ContractAuditResult,
  NegotiationTone,
} from "../lib/schema";
import {
  calculateRiskMetrics,
  ComputedRiskMetrics,
} from "../lib/scoring";
import {
  getSampleContractById,
  getDefaultSampleContract,
} from "../lib/sample-contracts";

export type AuditFilter = "all" | "critical" | "warning" | "fair" | "financial" | "missing";
export type AuditTab = "clauses" | "true_cost" | "missing_protections";

export interface AuditState {
  // Input Document Data
  rawText: string;
  contractTitle: string;
  activePresetId: string | null;

  // Analysis Outputs & Metrics
  auditResult: ContractAuditResult | null;
  riskMetrics: ComputedRiskMetrics | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // UI Interactive State
  selectedClauseId: string | null; // For synchronized click-to-scroll
  activeFilter: AuditFilter;
  activeTab: AuditTab;
  simulatedPenalties: Record<string, boolean>; // Financial simulator toggle states

  // Negotiation Counter-Offer State
  selectedClauseIdsForNegotiation: string[];
  negotiationTone: NegotiationTone;
  isNegotiationOpen: boolean;
  generatedCounterOffer: string | null;
  isGeneratingNegotiation: boolean;

  analysisNotice: string | null;
  activeEngineDisplay: string;

  // Actions
  setRawText: (text: string) => void;
  loadPreset: (presetId: string) => void;
  loadDefaultPreset: () => void;
  setAuditResult: (result: ContractAuditResult) => void;
  setIsAnalyzing: (loading: boolean) => void;
  setAnalysisNotice: (notice: string | null) => void;
  setActiveEngineDisplay: (engine: string) => void;
  setAnalysisError: (error: string | null) => void;
  setSelectedClauseId: (id: string | null) => void;
  setActiveFilter: (filter: AuditFilter) => void;
  setActiveTab: (tab: AuditTab) => void;
  toggleClauseForNegotiation: (clauseId: string) => void;
  selectAllFlaggedForNegotiation: () => void;
  clearNegotiationClauses: () => void;
  setNegotiationTone: (tone: NegotiationTone) => void;
  setIsNegotiationOpen: (open: boolean) => void;
  setGeneratedCounterOffer: (content: string | null) => void;
  setIsGeneratingNegotiation: (loading: boolean) => void;
  toggleSimulatedPenalty: (feeId: string) => void;
  resetAudit: () => void;
}

const defaultPreset = getDefaultSampleContract();
const initialMetrics = calculateRiskMetrics(defaultPreset.auditResult);

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      // Default to the first Judge Preset for immediate 0ms inspection
      rawText: defaultPreset.rawText,
      contractTitle: defaultPreset.name,
      activePresetId: defaultPreset.id,
      auditResult: defaultPreset.auditResult,
      riskMetrics: initialMetrics,
      isAnalyzing: false,
      analysisError: null,
      analysisNotice: null,
      activeEngineDisplay: "Google Gemini",

      selectedClauseId: null,
      activeFilter: "all",
      activeTab: "clauses",
      simulatedPenalties: {},

      selectedClauseIdsForNegotiation: defaultPreset.auditResult.clauses
        .filter((c) => c.severity === "critical" || c.severity === "warning")
        .slice(0, 3)
        .map((c) => c.id),
      negotiationTone: "polite_student",
      isNegotiationOpen: false,
      generatedCounterOffer: null,
      isGeneratingNegotiation: false,

      setRawText: (text: string) => {
        set({
          rawText: text,
          activePresetId: null,
        });
      },

      loadPreset: (presetId: string) => {
        const preset = getSampleContractById(presetId);
        if (!preset) return;

        const metrics = calculateRiskMetrics(preset.auditResult);
        const flaggedIds = preset.auditResult.clauses
          .filter((c) => c.severity === "critical" || c.severity === "warning")
          .slice(0, 3)
          .map((c) => c.id);

        // Caller controls isAnalyzing lifecycle
        set({
          rawText: preset.rawText,
          contractTitle: preset.name,
          activePresetId: preset.id,
          auditResult: preset.auditResult,
          riskMetrics: metrics,
          analysisError: null,
          selectedClauseId: null,
          selectedClauseIdsForNegotiation: flaggedIds,
          simulatedPenalties: {},
          activeFilter: "all",
          activeTab: "clauses",
          generatedCounterOffer: null,
        });
      },

      loadDefaultPreset: () => {
        get().loadPreset("slumlord-lease");
      },

      setAuditResult: (result: ContractAuditResult) => {
        const metrics = calculateRiskMetrics(result);
        const flaggedIds = result.clauses
          .filter((c) => c.severity === "critical" || c.severity === "warning")
          .slice(0, 3)
          .map((c) => c.id);

        // Caller controls isAnalyzing lifecycle
        set({
          auditResult: result,
          contractTitle: result.contractTitle,
          riskMetrics: metrics,
          analysisError: null,
          selectedClauseId: null,
          selectedClauseIdsForNegotiation: flaggedIds,
          simulatedPenalties: {},
          activeFilter: "all",
          activeTab: "clauses",
          generatedCounterOffer: null,
        });
      },

      setIsAnalyzing: (loading: boolean) => {
        set({ isAnalyzing: loading });
      },

      setAnalysisNotice: (notice: string | null) => {
        set({ analysisNotice: notice });
      },

      setActiveEngineDisplay: (engine: string) => {
        set({ activeEngineDisplay: engine });
      },

      setAnalysisError: (error: string | null) => {
        set({ analysisError: error });
      },

      setSelectedClauseId: (id: string | null) => {
        set({ selectedClauseId: id });
      },

      setActiveFilter: (filter: AuditFilter) => {
        set({ activeFilter: filter });
      },

      setActiveTab: (tab: AuditTab) => {
        set({ activeTab: tab });
      },

      toggleClauseForNegotiation: (clauseId: string) => {
        const current = get().selectedClauseIdsForNegotiation;
        const exists = current.includes(clauseId);
        const updated = exists
          ? current.filter((id) => id !== clauseId)
          : [...current, clauseId];
        set({ selectedClauseIdsForNegotiation: updated });
      },

      selectAllFlaggedForNegotiation: () => {
        const audit = get().auditResult;
        if (!audit) return;
        const flaggedIds = audit.clauses
          .filter((c) => c.severity === "critical" || c.severity === "warning")
          .map((c) => c.id);
        set({ selectedClauseIdsForNegotiation: flaggedIds });
      },

      clearNegotiationClauses: () => {
        set({ selectedClauseIdsForNegotiation: [] });
      },

      setNegotiationTone: (tone: NegotiationTone) => {
        set({ negotiationTone: tone });
      },

      setIsNegotiationOpen: (open: boolean) => {
        set({ isNegotiationOpen: open });
      },

      setGeneratedCounterOffer: (content: string | null) => {
        set({ generatedCounterOffer: content });
      },

      setIsGeneratingNegotiation: (loading: boolean) => {
        set({ isGeneratingNegotiation: loading });
      },

      toggleSimulatedPenalty: (feeId: string) => {
        const current = get().simulatedPenalties;
        set({
          simulatedPenalties: {
            ...current,
            [feeId]: !current[feeId],
          },
        });
      },

      resetAudit: () => {
        set({
          rawText: "",
          contractTitle: "Untitled Contract",
          activePresetId: null,
          auditResult: null,
          riskMetrics: null,
          isAnalyzing: false,
          analysisError: null,
          selectedClauseId: null,
          selectedClauseIdsForNegotiation: [],
          simulatedPenalties: {},
          generatedCounterOffer: null,
          activeFilter: "all",
          activeTab: "clauses",
        });
      },
    }),
    {
      name: "clauseclear_audit_store_v1",
      storage: createJSONStorage(() => localStorage),
      // Only persist essential state, not transient loading flags
      partialize: (state) => ({
        rawText: state.rawText,
        contractTitle: state.contractTitle,
        activePresetId: state.activePresetId,
        auditResult: state.auditResult,
        riskMetrics: state.riskMetrics,
        selectedClauseIdsForNegotiation: state.selectedClauseIdsForNegotiation,
        negotiationTone: state.negotiationTone,
        simulatedPenalties: state.simulatedPenalties,
      }),
    }
  )
);
