"use client";
import { useEffect, useMemo, useState } from "react";
import { SITES } from "@/lib/data";
import { scoreColor } from "@/lib/scoring";
import {
  computeBlueprint,
  defaultParams,
  COOLING_META,
  type BlueprintParams,
  type CoolingKey,
} from "@/lib/blueprint";
import ConceptRender from "@/components/ConceptRender";
import { StateTag } from "@/components/ui";

const RANKED = [...SITES].sort((a, b) => b.composite - a.composite);

function fmtM(m: number): string {
  return m >= 1000 ? `$${(m / 1000).toFixed(2)}B` : `$${m}M`;
}

function Spec({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="border border-rule bg-paper p-3">
      <div className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 font-mono text-lg text-ink">{value}</div>
      {sub && <div className="text-[11px] text-ink-faint">{sub}</div>}
    </div>
  );
}

export default function StudioPage() {
  const [siteId, setSiteId] = useState(RANKED[0].id);
  const site = SITES.find((s) => s.id === siteId) ?? RANKED[0];
  const [params, setParams] = useState<BlueprintParams>(() => defaultParams(RANKED[0]));

  // Deep link ?site=id, and reset assumptions when the site changes.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("site");
    if (q && SITES.some((s) => s.id === q)) setSiteId(q);
  }, []);

  function pickSite(id: string) {
    setSiteId(id);
    const s = SITES.find((x) => x.id === id);
    if (s) setParams(defaultParams(s));
  }

  const bp = useMemo(() => computeBlueprint(site, params), [site, params]);
  const set = (patch: Partial<BlueprintParams>) => setParams((p) => ({ ...p, ...patch }));
  const capexMax = Math.max(...bp.capex.map((c) => c.amount), 1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Blueprint studio</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Pick a real candidate site and size a build against it. Load, cooling, footprint, power draw, cost, and a
          feasibility read update as you change the assumptions. Figures are planning-grade estimates for screening.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <div className="sheet space-y-3 p-4">
            <h3 className="eyebrow">Site</h3>
            <select
              value={siteId}
              onChange={(e) => pickSite(e.target.value)}
              className="w-full border border-rule-strong bg-paper px-2 py-2 text-sm text-ink"
            >
              {RANKED.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.composite} · {s.name} ({s.state})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-faint">{site.data_note}</p>
          </div>

          <div className="sheet space-y-4 p-4">
            <h3 className="eyebrow">Assumptions</h3>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink-muted">IT load</span>
                <span className="font-mono text-ink">{params.itMW} MW</span>
              </div>
              <input type="range" min={25} max={500} step={25} value={params.itMW} onChange={(e) => set({ itMW: parseInt(e.target.value) })} className="w-full" />
            </div>

            <label className="block text-xs">
              <span className="text-ink-muted">Rack density</span>
              <select value={params.rackKW} onChange={(e) => set({ rackKW: parseInt(e.target.value) })} className="mt-1 w-full border border-rule-strong bg-paper px-2 py-1.5 text-ink">
                <option value={40}>40 kW (Hopper HGX)</option>
                <option value={130}>130 kW (GB200 NVL72)</option>
                <option value={600}>600 kW (Rubin, roadmap)</option>
              </select>
            </label>

            <label className="block text-xs">
              <span className="text-ink-muted">Cooling</span>
              <select value={params.cooling} onChange={(e) => set({ cooling: e.target.value as BlueprintParams["cooling"] })} className="mt-1 w-full border border-rule-strong bg-paper px-2 py-1.5 text-ink">
                <option value="auto">Auto (from climate + water)</option>
                <option value="liquid_dry">Liquid + dry coolers</option>
                <option value="liquid_evap">Liquid + evaporative</option>
                <option value="air_econ">Air economization</option>
              </select>
            </label>

            <label className="block text-xs">
              <span className="text-ink-muted">Electrical redundancy</span>
              <select value={params.redundancy} onChange={(e) => set({ redundancy: e.target.value as BlueprintParams["redundancy"] })} className="mt-1 w-full border border-rule-strong bg-paper px-2 py-1.5 text-ink">
                <option value="N">N</option>
                <option value="N+1">N+1</option>
                <option value="2N">2N</option>
              </select>
            </label>
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="sheet p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="eyebrow">Concept</h3>
                <span className="flex items-center gap-2 text-sm">
                  <StateTag state={site.state} />
                  <span className="grid h-7 w-8 place-items-center font-mono text-xs font-semibold text-paper-raised" style={{ backgroundColor: scoreColor(site.composite) }}>
                    {site.composite}
                  </span>
                </span>
              </div>
              <ConceptRender site={site} bp={bp} />
            </section>

            <section className="sheet p-4">
              <h3 className="eyebrow mb-3">Build</h3>
              <div className="grid grid-cols-2 gap-2">
                <Spec label="IT load" value={`${bp.itMW} MW`} sub={`${bp.racks.toLocaleString()} racks · ~${bp.gpus.toLocaleString()} GPUs`} />
                <Spec label="Grid draw" value={`${bp.facilityMW} MW`} sub={`PUE ${bp.pue}`} />
                <Spec label="Buildings" value={`${bp.halls} halls`} sub={`${(bp.buildingGsf / 1000).toFixed(0)}k GSF`} />
                <Spec label="Campus land" value={`${bp.landAcres} ac`} sub={`of ${site.acreage.toLocaleString()} ac parcel`} />
                <Spec label="Cooling" value={COOLING_META[bp.cooling].label.split(",")[0]} sub={bp.waterMgd >= 0.1 ? `~${bp.waterMgd} MGD water` : "minimal water"} />
                <Spec label="Timeline" value={`${bp.timelineMonths} mo`} sub="to energization" />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">{COOLING_META[bp.cooling].note}</p>
            </section>
          </div>

          {/* Power flow */}
          <section className="sheet p-4">
            <h3 className="eyebrow mb-3">Power in and out</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="border border-rule bg-paper px-3 py-2">
                <div className="font-mono text-ink">{bp.facilityMW} MW</div>
                <div className="text-[11px] text-ink-faint">grid draw</div>
              </div>
              <span className="text-ink-faint">→</span>
              <div className="border border-rule bg-paper px-3 py-2">
                <div className="font-mono text-ink">{bp.itMW} MW</div>
                <div className="text-[11px] text-ink-faint">to compute</div>
              </div>
              <span className="text-ink-faint">+</span>
              <div className="border border-rule bg-paper px-3 py-2">
                <div className="font-mono text-ink">{Math.round((bp.facilityMW - bp.itMW) * 10) / 10} MW</div>
                <div className="text-[11px] text-ink-faint">overhead (cooling, losses)</div>
              </div>
              <span className="text-ink-faint">→</span>
              <div className="border border-rule bg-paper px-3 py-2">
                <div className="font-mono text-ink">{bp.wasteHeatMW} MW</div>
                <div className="text-[11px] text-ink-faint">heat rejected</div>
              </div>
            </div>
          </section>

          {/* Cost */}
          <section className="sheet p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="eyebrow">Facility capex</h3>
              <span className="font-mono text-sm text-ink">
                {fmtM(bp.facilityCapex)} <span className="text-ink-faint">· {bp.facilityCapexPerMW} $M/MW</span>
              </span>
            </div>
            <div className="space-y-1.5">
              {bp.capex.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  <span className="w-44 shrink-0 text-ink-muted">{c.label}</span>
                  <div className="h-3 flex-1 bg-paper-sunken">
                    <div className="h-full bg-forest/70" style={{ width: `${(c.amount / capexMax) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono text-ink">{fmtM(c.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-rule pt-3 text-xs sm:grid-cols-3">
              <div><span className="text-ink-faint">Annual energy</span><div className="font-mono text-ink">{fmtM(bp.annualEnergy)}/yr</div></div>
              <div><span className="text-ink-faint">IT hardware (separate)</span><div className="font-mono text-ink">{fmtM(bp.itHardware)}</div></div>
              <div><span className="text-ink-faint">Energy price</span><div className="font-mono text-ink">${site.power_cost_per_mwh}/MWh</div></div>
            </div>
          </section>

          {/* Feasibility + contractors */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="sheet p-4">
              <h3 className="eyebrow mb-3">Feasibility</h3>
              <ul className="space-y-2">
                {bp.feasibility.map((f) => (
                  <li key={f.label} className="flex gap-2 text-xs">
                    <span className="mt-0.5 h-2 w-2 shrink-0" style={{ backgroundColor: f.ok ? "#2f7d4f" : "#b3612a" }} />
                    <span>
                      <span className="font-medium text-ink">{f.label}. </span>
                      <span className="text-ink-muted">{f.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="sheet p-4">
              <h3 className="eyebrow mb-3">Representative contractors</h3>
              <ul className="space-y-2">
                {bp.contractors.map((c) => (
                  <li key={c.role} className="text-xs">
                    <span className="text-ink-faint">{c.role}: </span>
                    <span className="text-ink">{c.firms}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-faint">
                Firms active in this market, listed to size the bench. Not engaged or contacted.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
