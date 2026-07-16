// Ingestion orchestrator. Pulls live public data for every candidate, derives
// regional/estimated fields, computes scores, and writes a committed snapshot
// that the app serves at runtime (no live API calls in production).
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CANDIDATES } from "./candidates";
import { deriveRegional } from "./regional";
import { climate, floodZone, nearestIXKm, nearestSubstationKm, opportunityZone, seismic } from "./sources";
import { log } from "./util";
import { scoreSite } from "../../lib/scoring";
import type { Site } from "../../lib/types";

async function ingestOne(c: (typeof CANDIDATES)[number]): Promise<Site> {
  log(c.id, "fetching…");
  const [sub, clim, seis, flood, ix, oz] = await Promise.all([
    nearestSubstationKm(c.lat, c.lng),
    climate(c.lat, c.lng),
    seismic(c.lat, c.lng),
    floodZone(c.lat, c.lng),
    nearestIXKm(c.lat, c.lng, c.state),
    opportunityZone(c.lat, c.lng),
  ]);
  const reg = deriveRegional(c, ix.km);

  const site: Site = {
    id: c.id,
    name: c.name,
    state: c.state,
    county: c.county,
    lat: c.lat,
    lng: c.lng,
    iso: c.iso,

    acreage: reg.acreage,
    price_per_acre: reg.price_per_acre,
    zoning: reg.zoning,
    geotech: reg.geotech,

    distance_to_substation_km: sub.km,
    substation_headroom_mw: reg.substation_headroom_mw,
    interconnection_queue_status: reg.interconnection_queue_status,
    interconnection_queue_wait_years: reg.interconnection_queue_wait_years,
    power_cost_per_mwh: reg.power_cost_per_mwh,
    feed_redundancy: reg.feed_redundancy,

    distance_to_fiber_km: reg.distance_to_fiber_km,
    distance_to_ix_km: ix.km,
    latency_tier: reg.latency_tier,

    wet_bulb_temp_avg_c: clim.wetBulb,
    ambient_temp_avg_c: clim.ambient,
    water_availability: reg.water_availability,

    seismic_risk_tier: seis.tier,
    flood_zone: flood.zone,
    wildfire_risk: reg.wildfire_risk,
    hurricane_exposure: reg.hurricane_exposure,

    opportunity_zone: oz.isOZ,
    dc_tax_program: reg.dc_tax_program,
    local_abatement: reg.local_abatement,
    incentive_notes: reg.incentive_notes,

    trades_availability: reg.trades_availability,
    distance_to_labor_market_km: reg.distance_to_labor_market_km,
    est_build_months: reg.est_build_months,

    data_note: c.context,
    provenance: {
      distance_to_substation_km: sub.prov,
      wet_bulb_temp_avg_c: clim.prov,
      ambient_temp_avg_c: clim.prov,
      seismic_risk_tier: seis.prov,
      flood_zone: flood.prov,
      distance_to_ix_km: ix.prov,
      opportunity_zone: oz.prov,
      ...reg.provenance,
    },
    sources: [
      `Substation: ${sub.prov === "measured" ? "HIFLD national substations (ArcGIS)" : "estimated"}`,
      `Climate: ${clim.prov === "derived" ? "Open-Meteo archive (2023) → Stull wet-bulb" : "estimated"}`,
      `Seismic: ${seis.prov === "measured" ? `USGS Design Maps ASCE 7-16 (SDS ${seis.sds})` : "estimated"}`,
      `Flood: ${flood.prov === "measured" ? `FEMA NFHL (${flood.raw})` : "unmapped/minimal"}`,
      `Interconnection: ${ix.prov === "measured" ? "PeeringDB nearest facility" : "estimated"}`,
      `Opportunity Zone: ${oz.prov === "measured" ? "HUD Opportunity Zones (ArcGIS)" : "estimated"}`,
    ],
  };

  log(c.id, `sub ${sub.km}km(${sub.prov}) · wb ${clim.wetBulb}°C · seis ${seis.tier} · flood ${flood.zone} · ix ${ix.km}km · oz ${oz.isOZ}`);
  return site;
}

async function main() {
  const out: Site[] = [];
  // Sequential to stay polite to public endpoints.
  for (const c of CANDIDATES) {
    try {
      out.push(await ingestOne(c));
    } catch (e: any) {
      log(c.id, `FAILED: ${e?.message ?? e}`);
    }
  }

  const scored = out.map(scoreSite).sort((a, b) => b.composite - a.composite);

  // Provenance summary for the README / transparency.
  const provCounts: Record<string, number> = {};
  for (const s of scored)
    for (const p of Object.values(s.provenance ?? {})) {
      if (p) provCounts[p] = (provCounts[p] ?? 0) + 1;
    }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    count: scored.length,
    provenanceCounts: provCounts,
    sites: scored,
  };

  const dir = join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "sites.snapshot.json"), JSON.stringify(snapshot, null, 2));
  process.stdout.write(`\n✔ wrote data/sites.snapshot.json — ${scored.length} sites\n`);
  process.stdout.write(`  provenance: ${JSON.stringify(provCounts)}\n`);
  process.stdout.write(`  top: ${scored.slice(0, 3).map((s) => `${s.name} ${s.composite}`).join(" · ")}\n`);
}

main();
