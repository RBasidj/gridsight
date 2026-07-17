import Link from "next/link";
import { SNAPSHOT, SITES } from "@/lib/data";
import { scoreColor } from "@/lib/scoring";

export default function Home() {
  const top = [...SITES].sort((a, b) => b.composite - a.composite).slice(0, 6);
  const prov = SNAPSHOT.provenanceCounts;
  const totalFields = Object.values(prov).reduce((a, b) => a + b, 0) || 1;
  const publicFields = (prov.measured ?? 0) + (prov.derived ?? 0) + (prov.regional ?? 0);
  const publicPct = Math.round((publicFields / totalFields) * 100);

  return (
    <div className="space-y-12 py-4">
      <section className="max-w-3xl">
        <p className="eyebrow mb-3">Texas · ERCOT / New York · NYISO</p>
        <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Where would a GPU cluster actually get built?
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">
          GridSight ranks candidate parcels in Texas and New York for GPU data-center development. It scores each site
          across seven factors that weigh on whether a cluster can get powered and built: grid interconnection, land,
          connectivity, cooling, hazard exposure, incentives, and construction labor. Change how much any factor counts
          and the ranking updates. From a shortlisted site you can open the Studio and size an actual build against it.
          The sample covers the two states where Fluidstack is building for Anthropic through 2026.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/map" className="bg-forest px-5 py-2.5 text-sm font-medium text-paper-raised hover:bg-forest-soft">
            Open the map
          </Link>
          <Link href="/studio" className="border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper-sunken">
            Open the Studio
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 divide-x divide-rule border-y border-rule sm:grid-cols-4">
        {[
          { k: String(SITES.length), l: "candidate sites" },
          { k: "7", l: "scoring factors" },
          { k: `${publicPct}%`, l: "figures from public data" },
          { k: "$0", l: "API cost to load a session" },
        ].map((s) => (
          <div key={s.l} className="px-4 py-5">
            <div className="font-mono text-3xl font-semibold text-ink">{s.k}</div>
            <div className="mt-1 text-xs text-ink-muted">{s.l}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="eyebrow mb-3">Highest scoring so far</h2>
        <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {top.map((s) => (
            <Link key={s.id} href="/map" className="group flex items-center gap-3 bg-paper-raised p-4 hover:bg-paper-sunken">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center font-mono font-semibold text-paper-raised"
                style={{ backgroundColor: scoreColor(s.composite) }}
              >
                {s.composite}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{s.name}</div>
                <div className="truncate font-mono text-[11px] text-ink-faint">
                  {s.county} County, {s.state} · {s.substation_headroom_mw} MW · {s.wet_bulb_temp_avg_c}°C WB
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-xl font-bold text-ink">Where the numbers come from</h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Substation distance, summer wet-bulb, seismic hazard, flood zone, nearby interconnection facilities, and
            Opportunity Zone status are read from public datasets: HIFLD, NOAA through Open-Meteo, USGS, FEMA, PeeringDB,
            and HUD. Figures with no free parcel-level feed, such as land price, per-substation headroom, and local labor
            supply, are estimates based on the location, and they are labeled that way. A small colored square sits next
            to each figure to show how it was sourced. Scoring runs once when the dataset is built, so opening the site
            does not call a paid API.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-display text-xl font-bold text-ink">Credit, and what was left out</h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            The shape of this pipeline, public data into a weighted score into a map and a short write-up, follows the
            OpenClaw Reroof lead-generation guide, repointed from rooftop solar leads to industrial land for compute. Two
            parts of that guide were left out on purpose: tracing a parcel back to a named owner, and any automated
            outreach. GridSight stops at ranking land. It does not profile people and it does not contact anyone.
          </p>
        </div>
      </section>
    </div>
  );
}
