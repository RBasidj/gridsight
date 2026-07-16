"use client";
import { CATEGORY_META } from "@/lib/scoring";
import { useApp } from "@/lib/store";

export default function WeightSliders() {
  const { weights, setWeight, resetWeights, stateFilter, setStateFilter, minScore, setMinScore } = useApp();
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="eyebrow">Weights</h3>
        <button onClick={resetWeights} className="text-xs text-forest hover:underline">
          reset
        </button>
      </div>

      <div className="space-y-3">
        {CATEGORY_META.map((c) => {
          const pct = Math.round((weights[c.key] / total) * 100);
          return (
            <div key={c.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-muted" title={c.blurb}>
                  {c.label}
                </span>
                <span className="font-mono text-ink-faint">{pct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={weights[c.key]}
                onChange={(e) => setWeight(c.key, parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-faint">Weights rescale to 100%. Move one and the ranking follows.</p>

      <div className="rule-t pt-4">
        <h3 className="eyebrow mb-2">Filters</h3>
        <div className="mb-3 flex gap-1">
          {(["ALL", "TX", "NY"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`flex-1 border px-2 py-1.5 text-xs transition ${
                stateFilter === s
                  ? "border-forest bg-forest text-paper-raised"
                  : "border-rule-strong text-ink-muted hover:text-ink"
              }`}
            >
              {s === "ALL" ? "Both" : s}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-muted">Minimum score</span>
          <span className="font-mono text-ink-faint">{minScore}</span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(parseInt(e.target.value))}
          className="mt-1 w-full"
        />
      </div>
    </div>
  );
}
