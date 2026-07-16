"use client";
import Link from "next/link";
import { SITES } from "@/lib/data";
import { composite, scoreColor, CATEGORY_META } from "@/lib/scoring";
import { useApp } from "@/lib/store";
import { ScorePill } from "@/components/ui";

export default function ComparePage() {
  const { shortlist, toggleShortlist, weights } = useApp();
  const sites = SITES.filter((s) => shortlist.includes(s.id));

  if (sites.length < 2) {
    return (
      <div className="sheet grid place-items-center p-12 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="font-display text-xl font-bold text-ink">Put two sites side by side</h1>
          <p className="text-sm text-ink-muted">
            Add sites to your compare list from the detail panel on the map, then come back here to read them across
            the same rows. You have {sites.length} selected so far.
          </p>
          <Link href="/map" className="inline-block bg-forest px-4 py-2 text-sm font-medium text-paper-raised">
            Go to the map
          </Link>
        </div>
      </div>
    );
  }

  const scores = sites.map((s) => composite(s.categories, weights));

  function MetricRow({
    label,
    values,
    better,
    fmt,
  }: {
    label: string;
    values: number[];
    better: "hi" | "lo";
    fmt: (n: number) => string;
  }) {
    const best = better === "hi" ? Math.max(...values) : Math.min(...values);
    return (
      <tr className="border-b border-rule">
        <td className="py-2 pr-3 text-sm text-ink-muted">{label}</td>
        {values.map((v, i) => (
          <td key={i} className={`px-3 py-2 font-mono text-sm ${v === best ? "font-semibold text-forest" : "text-ink"}`}>
            {fmt(v)}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-ink">Comparing {sites.length} sites</h1>
        <span className="text-xs text-ink-faint">Best value in each row is marked. Scored with your current weights.</span>
      </div>

      <div className="sheet overflow-x-auto p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-strong">
              <th className="w-44 py-2 text-left"><span className="eyebrow">metric</span></th>
              {sites.map((s, i) => (
                <th key={s.id} className="px-3 py-2 text-left align-top">
                  <div className="flex items-center gap-2">
                    <ScorePill score={scores[i]} size="sm" />
                    <div>
                      <div className="text-sm font-medium text-ink">{s.name}</div>
                      <div className="font-mono text-[11px] text-ink-faint">
                        {s.county}, {s.state}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toggleShortlist(s.id)} className="mt-1 text-[11px] text-ink-faint hover:text-[#a8382c]">
                    remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule-strong bg-paper-sunken/60">
              <td className="py-2 pr-3 text-sm font-semibold text-ink">Composite</td>
              {scores.map((v, i) => (
                <td key={i} className="px-3 py-2">
                  <span className="px-2 py-0.5 font-mono text-sm font-semibold text-paper-raised" style={{ backgroundColor: scoreColor(v) }}>
                    {v}
                  </span>
                </td>
              ))}
            </tr>

            {CATEGORY_META.map((c) => (
              <MetricRow
                key={c.key}
                label={c.label}
                better="hi"
                values={sites.map((s) => s.categories.find((x) => x.key === c.key)!.score)}
                fmt={(n) => `${n}`}
              />
            ))}

            <tr>
              <td colSpan={sites.length + 1} className="pt-4 pb-1"><span className="eyebrow">key figures</span></td>
            </tr>
            <MetricRow label="Substation distance (km)" better="lo" values={sites.map((s) => s.distance_to_substation_km)} fmt={(n) => `${n}`} />
            <MetricRow label="Headroom (MW)" better="hi" values={sites.map((s) => s.substation_headroom_mw)} fmt={(n) => `${n}`} />
            <MetricRow label="Interconnection wait (yr)" better="lo" values={sites.map((s) => s.interconnection_queue_wait_years)} fmt={(n) => `${n}`} />
            <MetricRow label="Energy cost ($/MWh)" better="lo" values={sites.map((s) => s.power_cost_per_mwh)} fmt={(n) => `$${n}`} />
            <MetricRow label="Summer wet-bulb (°C)" better="lo" values={sites.map((s) => s.wet_bulb_temp_avg_c)} fmt={(n) => `${n}`} />
            <MetricRow label="Acreage" better="hi" values={sites.map((s) => s.acreage)} fmt={(n) => n.toLocaleString()} />
            <MetricRow label="Price per acre ($)" better="lo" values={sites.map((s) => s.price_per_acre)} fmt={(n) => `$${n.toLocaleString()}`} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
