"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { SITES } from "@/lib/data";
import { composite } from "@/lib/scoring";
import { useApp } from "@/lib/store";
import WeightSliders from "@/components/WeightSliders";
import SiteDetailPanel from "@/components/SiteDetailPanel";
import { ProvenanceLegend, ScorePill, StateTag } from "@/components/ui";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-ink-faint">Loading map</div>,
});

export default function MapPage() {
  const { weights, stateFilter, minScore, selectedId, select } = useApp();

  const filtered = useMemo(() => {
    return SITES.map((s) => ({ site: s, score: composite(s.categories, weights) }))
      .filter(({ site }) => stateFilter === "ALL" || site.state === stateFilter)
      .filter(({ score }) => score >= minScore)
      .sort((a, b) => b.score - a.score);
  }, [weights, stateFilter, minScore]);

  const selected = SITES.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_400px]">
      <div className="space-y-4">
        <div className="sheet p-4">
          <WeightSliders />
        </div>
        <div className="sheet p-3">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="eyebrow">Ranking</h3>
            <span className="font-mono text-xs text-ink-faint">{filtered.length}</span>
          </div>
          <div className="max-h-[40vh] divide-y divide-rule overflow-y-auto xl:max-h-[58vh]">
            {filtered.map(({ site, score }, i) => (
              <button
                key={site.id}
                onClick={() => select(site.id)}
                className={`flex w-full items-center gap-2 px-1 py-1.5 text-left transition ${
                  selectedId === site.id ? "bg-paper-sunken" : "hover:bg-paper-sunken/60"
                }`}
              >
                <span className="w-5 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
                <ScorePill score={score} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{site.name}</span>
                  <span className="block truncate text-[11px] text-ink-faint">{site.county} County</span>
                </span>
                <StateTag state={site.state} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sheet overflow-hidden" style={{ height: "min(78vh, 760px)" }}>
        <MapView sites={filtered.map((f) => f.site)} />
        <div className="border-t border-rule px-3 py-2">
          <ProvenanceLegend />
        </div>
      </div>

      <div className="xl:max-h-[78vh] xl:overflow-y-auto xl:pr-1">
        {selected ? (
          <div className="sheet p-4">
            <SiteDetailPanel site={selected} onClose={() => select(null)} />
          </div>
        ) : (
          <div className="sheet grid h-full min-h-[200px] place-items-center p-6 text-center text-sm text-ink-muted">
            Pick a site from the map or the list to see its score breakdown, a sketch of a cluster on the parcel, and a
            short written read.
          </div>
        )}
      </div>
    </div>
  );
}
