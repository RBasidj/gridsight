"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_WEIGHTS, type CategoryKey } from "./scoring";
import type { PipelineStage } from "./types";

interface AppState {
  weights: Record<CategoryKey, number>;
  setWeight: (key: CategoryKey, value: number) => void;
  resetWeights: () => void;

  stateFilter: "ALL" | "TX" | "NY";
  setStateFilter: (v: "ALL" | "TX" | "NY") => void;
  minScore: number;
  setMinScore: (v: number) => void;

  selectedId: string | null;
  select: (id: string | null) => void;

  shortlist: string[];
  toggleShortlist: (id: string) => void;

  stages: Record<string, PipelineStage>;
  setStage: (id: string, stage: PipelineStage) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      weights: { ...DEFAULT_WEIGHTS },
      setWeight: (key, value) => set((s) => ({ weights: { ...s.weights, [key]: value } })),
      resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),

      stateFilter: "ALL",
      setStateFilter: (v) => set({ stateFilter: v }),
      minScore: 0,
      setMinScore: (v) => set({ minScore: v }),

      selectedId: null,
      select: (id) => set({ selectedId: id }),

      shortlist: [],
      toggleShortlist: (id) =>
        set((s) => ({
          shortlist: s.shortlist.includes(id)
            ? s.shortlist.filter((x) => x !== id)
            : s.shortlist.length >= 5
            ? s.shortlist
            : [...s.shortlist, id],
        })),

      stages: {},
      setStage: (id, stage) => set((s) => ({ stages: { ...s.stages, [id]: stage } })),
    }),
    { name: "gridsight-v1" }
  )
);
