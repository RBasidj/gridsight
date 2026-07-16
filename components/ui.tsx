"use client";
import { scoreColor } from "@/lib/scoring";
import { PROVENANCE_META, type Provenance } from "@/lib/types";

export function ScorePill({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = scoreColor(score);
  const cls = size === "lg" ? "h-11 w-11 text-lg" : size === "sm" ? "h-6 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span
      className={`grid ${cls} shrink-0 place-items-center font-mono font-semibold text-paper-raised`}
      style={{ backgroundColor: color }}
      title={`Composite score ${score} of 100`}
    >
      {score}
    </span>
  );
}

export function ProvenanceDot({ prov }: { prov?: Provenance }) {
  if (!prov) return null;
  const m = PROVENANCE_META[prov];
  return (
    <span
      className="inline-block h-2 w-2 shrink-0"
      style={{ backgroundColor: m.color }}
      title={`${m.label}. ${m.hint}.`}
    />
  );
}

export function ProvenanceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
      <span className="font-mono uppercase tracking-wide text-ink-faint">sourcing</span>
      {(Object.keys(PROVENANCE_META) as Provenance[]).map((p) => (
        <span key={p} className="flex items-center gap-1.5" title={PROVENANCE_META[p].hint}>
          <span className="h-2 w-2" style={{ backgroundColor: PROVENANCE_META[p].color }} />
          {PROVENANCE_META[p].label}
        </span>
      ))}
    </div>
  );
}

export function StateTag({ state }: { state: "TX" | "NY" }) {
  return (
    <span className="border border-rule-strong px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
      {state} {state === "TX" ? "ERCOT" : "NYISO"}
    </span>
  );
}
