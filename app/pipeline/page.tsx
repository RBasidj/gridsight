"use client";
import { SITES } from "@/lib/data";
import { composite } from "@/lib/scoring";
import { useApp } from "@/lib/store";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";
import { ScorePill, StateTag } from "@/components/ui";

export default function PipelinePage() {
  const { stages, setStage, weights, shortlist, toggleShortlist } = useApp();

  const tracked =
    shortlist.length > 0
      ? SITES.filter((s) => shortlist.includes(s.id))
      : [...SITES].sort((a, b) => b.composite - a.composite).slice(0, 8);

  const stageOf = (id: string): PipelineStage => stages[id] ?? "sourced";
  const idx = (st: PipelineStage) => PIPELINE_STAGES.findIndex((s) => s.id === st);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Deal pipeline</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {shortlist.length > 0
            ? "Tracking the sites on your compare list."
            : "Showing the top candidates. Add sites to your compare list to curate this board."}{" "}
          Stage is saved in your browser. The board holds deal stage only, no personal data.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => {
          const items = tracked.filter((s) => stageOf(s.id) === stage.id);
          return (
            <div key={stage.id} className="sheet flex min-h-[200px] flex-col p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="eyebrow">{stage.label}</h3>
                <span className="border border-rule px-1.5 font-mono text-xs text-ink-faint">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2">
                {items.map((s) => {
                  const i = idx(stage.id);
                  return (
                    <div key={s.id} className="border border-rule bg-paper p-2">
                      <div className="flex items-center gap-2">
                        <ScorePill score={composite(s.categories, weights)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-ink">{s.name}</div>
                          <StateTag state={s.state} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <button
                          disabled={i === 0}
                          onClick={() => setStage(s.id, PIPELINE_STAGES[i - 1].id)}
                          className="px-1.5 py-0.5 text-ink-muted enabled:hover:bg-paper-sunken disabled:opacity-30"
                        >
                          back
                        </button>
                        <button
                          onClick={() => toggleShortlist(s.id)}
                          className="text-[11px] text-ink-faint hover:text-[#a8382c]"
                          title="Remove from board"
                        >
                          drop
                        </button>
                        <button
                          disabled={i === PIPELINE_STAGES.length - 1}
                          onClick={() => setStage(s.id, PIPELINE_STAGES[i + 1].id)}
                          className="px-1.5 py-0.5 text-forest enabled:hover:bg-paper-sunken disabled:opacity-30"
                        >
                          advance
                        </button>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <div className="grid h-16 place-items-center font-mono text-xs text-ink-faint">·</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
