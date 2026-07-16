"use client";
import { useEffect, useState } from "react";
import { composite, scoreColor, type ScoredSite } from "@/lib/scoring";
import { useApp } from "@/lib/store";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";
import CategoryRadar from "./CategoryRadar";
import FootprintSchematic from "./FootprintSchematic";
import { ProvenanceDot, ScorePill, StateTag } from "./ui";

function Stat({ label, value, prov }: { label: string; value: React.ReactNode; prov?: any }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-rule py-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-ink-muted">
        <ProvenanceDot prov={prov} />
        {label}
      </span>
      <span className="text-right font-mono text-ink">{value}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sheet p-4">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

export default function SiteDetailPanel({ site, onClose }: { site: ScoredSite; onClose?: () => void }) {
  const { weights, shortlist, toggleShortlist, stages, setStage } = useApp();
  const score = composite(site.categories, weights);
  const p = site.provenance ?? {};
  const stage = stages[site.id] ?? "sourced";

  const [brief, setBrief] = useState<{ text: string; source: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setBrief(null);
    fetch(`/api/brief?id=${site.id}`)
      .then((r) => r.json())
      .then((d) => alive && setBrief(d))
      .catch(() => alive && setBrief({ text: "Brief could not be loaded.", source: "error" }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [site.id]);

  const inList = shortlist.includes(site.id);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ScorePill score={score} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-lg font-bold text-ink">{site.name}</h2>
            <StateTag state={site.state} />
          </div>
          <p className="font-mono text-xs text-ink-faint">
            {site.county} County · {site.lat.toFixed(3)}, {site.lng.toFixed(3)}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="px-2 py-1 text-ink-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{site.data_note}</p>

      <div className="flex gap-2">
        <button
          onClick={() => toggleShortlist(site.id)}
          className={`flex-1 border px-3 py-2 text-sm transition ${
            inList ? "border-forest bg-forest text-paper-raised" : "border-rule-strong text-ink hover:bg-paper-sunken"
          }`}
        >
          {inList ? "In compare list" : "Add to compare"}
        </button>
        <select
          value={stage}
          onChange={(e) => setStage(site.id, e.target.value as PipelineStage)}
          className="border border-rule-strong bg-paper-raised px-2 py-2 text-sm text-ink"
          aria-label="Pipeline stage"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <Block title="Category scores">
        <CategoryRadar categories={site.categories} color={scoreColor(score)} />
        <div className="mt-2 space-y-2">
          {site.categories.map((c) => (
            <div key={c.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs">
                <span className="text-ink-muted">{c.label}</span>
                <span className="font-mono text-ink-faint">{c.score}</span>
              </div>
              <div className="h-1.5 bg-paper-sunken">
                <div className="h-full" style={{ width: `${c.score}%`, backgroundColor: scoreColor(c.score) }} />
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Key figures">
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div>
            <Stat label="Distance to substation" value={`${site.distance_to_substation_km} km`} prov={p.distance_to_substation_km} />
            <Stat label="Substation headroom" value={`${site.substation_headroom_mw} MW`} prov={p.substation_headroom_mw} />
            <Stat label="Interconnection wait" value={`~${site.interconnection_queue_wait_years} yr`} prov={p.interconnection_queue_wait_years} />
            <Stat label="Energy cost" value={`$${site.power_cost_per_mwh}/MWh`} prov={p.power_cost_per_mwh} />
            <Stat label="Acreage" value={`${site.acreage.toLocaleString()} ac`} prov={p.acreage} />
            <Stat label="Price per acre" value={`$${site.price_per_acre.toLocaleString()}`} prov={p.price_per_acre} />
            <Stat label="Zoning" value={site.zoning.replace(/_/g, " ")} prov={p.zoning} />
          </div>
          <div>
            <Stat label="Summer wet-bulb" value={`${site.wet_bulb_temp_avg_c} °C`} prov={p.wet_bulb_temp_avg_c} />
            <Stat label="Annual ambient" value={`${site.ambient_temp_avg_c} °C`} prov={p.ambient_temp_avg_c} />
            <Stat label="Nearest IX facility" value={`${site.distance_to_ix_km} km`} prov={p.distance_to_ix_km} />
            <Stat label="Seismic hazard" value={site.seismic_risk_tier.replace(/_/g, " ")} prov={p.seismic_risk_tier} />
            <Stat label="Flood zone" value={site.flood_zone.toUpperCase().replace("_", " ")} prov={p.flood_zone} />
            <Stat label="Hurricane exposure" value={site.hurricane_exposure.replace(/_/g, " ")} prov={p.hurricane_exposure} />
            <Stat label="Opportunity Zone" value={site.opportunity_zone ? "Yes" : "No"} prov={p.opportunity_zone} />
          </div>
        </div>
        <p className="mt-3 border-l-2 border-rule-strong bg-paper-sunken/60 px-3 py-2 text-xs text-ink-muted">
          <span className="font-medium text-ink">Incentives.</span> {site.incentive_notes}
        </p>
      </Block>

      <Block title="Possible cluster footprint">
        <FootprintSchematic site={site} />
      </Block>

      <section className="sheet p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="eyebrow">Written read</h3>
          {brief && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
              {brief.source === "claude" ? "Claude, cached" : "template"}
            </span>
          )}
        </div>
        {loading ? (
          <p className="animate-pulse text-sm text-ink-faint">Loading brief.</p>
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{brief?.text}</p>
        )}
      </section>

      <Block title="Where the data came from">
        <ul className="space-y-1 font-mono text-[11px] text-ink-muted">
          {(site.sources ?? []).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Block>
    </div>
  );
}
