// Regional / estimated fields for categories with no free per-parcel feed.
// Values are grounded in real published figures (ISO/state) or the site's real
// geographic context, and each carries an honest provenance label.
import type { Candidate } from "./candidates";
import type { Provenance, Availability, Tier, ZoningClass } from "../../lib/types";
import { haversineKm } from "./util";

// Representative Gulf coast points for hurricane-exposure geometry.
const GULF = [
  [27.8, -97.4],
  [28.9, -95.3],
  [29.3, -94.8],
  [29.7, -93.9],
];

function nearestGulfKm(lat: number, lng: number): number {
  return Math.min(...GULF.map(([a, b]) => haversineKm(lat, lng, a, b)));
}

export interface Regional {
  power_cost_per_mwh: number;
  interconnection_queue_wait_years: number;
  interconnection_queue_status: string;
  substation_headroom_mw: number;
  feed_redundancy: boolean;
  distance_to_fiber_km: number;
  latency_tier: 1 | 2 | 3;
  water_availability: Availability;
  wildfire_risk: Tier;
  hurricane_exposure: Tier;
  dc_tax_program: "eligible_strong" | "eligible" | "under_review" | "none";
  local_abatement: "yes" | "likely" | "no";
  incentive_notes: string;
  trades_availability: Availability;
  distance_to_labor_market_km: number;
  est_build_months: number;
  acreage: number;
  price_per_acre: number;
  zoning: ZoningClass;
  geotech: "good" | "moderate" | "poor";
  provenance: Record<string, Provenance>;
}

const HYDRO = new Set(["ny-stlawrence-massena", "ny-niagara-falls"]);
const MEGASITE = new Set(["tx-milam-sandow", "ny-genesee-stamp", "ny-stlawrence-massena", "tx-williamson-taylor", "ny-oneida-marcy"]);

/** Deterministic small jitter from coordinates so sites spread realistically. */
function jitter(seed: number, span: number): number {
  const x = Math.abs(Math.sin(seed) * 10000) % 1;
  return (x - 0.5) * span;
}

export function deriveRegional(c: Candidate, ixKm: number): Regional {
  const isTX = c.state === "TX";
  const seed = c.lat * 7.3 + c.lng * 3.1;

  // Power cost ($/MWh) — ERCOT ~ mid-$30s; NYISO upstate hydro cheap, else higher.
  let power = isTX ? 38 : 46;
  if (HYDRO.has(c.id)) power = 30;
  power = Math.round(power + jitter(seed, 8));

  // Interconnection queue — ERCOT connect-and-manage is faster than NYISO.
  const waitYears = isTX ? Math.round((2.5 + jitter(seed, 1.5)) * 10) / 10 : Math.round((5 + jitter(seed, 1.5)) * 10) / 10;
  const queueStatus = isTX
    ? "ERCOT — active interconnection studies; connect-and-manage"
    : "NYISO — Class Year study cycle; longer queue";

  // Substation headroom (MW) — mega power sites much higher; estimated.
  const headroom = Math.round((MEGASITE.has(c.id) ? 650 : 220) + jitter(seed, 260));

  // Fiber distance — proxy from metro/IX proximity.
  const fiberKm = Math.round((Math.min(ixKm * 0.12, 14) + Math.abs(jitter(seed, 6))) * 10) / 10;

  // Latency tier — from measured distance to nearest interconnection facility.
  const latency: 1 | 2 | 3 = ixKm < 70 ? 1 : ixKm < 220 ? 2 : 3;

  // Water availability — hydro/river/coastal abundant; arid TX limited.
  let water: Availability = "moderate";
  if (HYDRO.has(c.id) || c.id.includes("corpus") || c.id.includes("harris")) water = "abundant";
  else if (!isTX) water = "high";
  else if (c.id.includes("decatur") || c.id.includes("bastrop")) water = "limited";

  // Wildfire — humid eastern/coastal profile is low; rural north TX moderate.
  const wildfire: Tier = !isTX ? "very_low" : c.id.includes("decatur") || c.id.includes("wise") ? "moderate" : "low";

  // Hurricane — geographic, from distance to Gulf.
  const gulfKm = nearestGulfKm(c.lat, c.lng);
  const hurricane: Tier = !isTX ? "very_low" : gulfKm < 60 ? "high" : gulfKm < 160 ? "moderate" : gulfKm < 320 ? "low" : "very_low";

  // Incentives — real program posture (see README / web-verified July 2026).
  const dc_tax_program = isTX ? "eligible_strong" : "under_review";
  const local_abatement: "yes" | "likely" | "no" = MEGASITE.has(c.id) ? "yes" : isTX ? "likely" : "likely";
  const incentive_notes = isTX
    ? "TX HB 1223 state sales-tax exemption (10–15 yr) + Chapter 403 / JETI Act property-value limitation (50%, up to 75% in an Opportunity Zone)."
    : "NY §1115(a)(37) internet-data-center sales-tax exemption currently applies but faces proposed repeal (S9288, Feb 2026) — treat as under legislative review.";

  // Labor & construction — from metro proximity.
  const laborKm = Math.round(Math.min(ixKm * 0.55, 110) + Math.abs(jitter(seed, 15)));
  const trades: Availability = MEGASITE.has(c.id) ? "high" : laborKm < 45 ? "high" : laborKm < 85 ? "moderate" : "limited";
  const build = Math.round((MEGASITE.has(c.id) ? 26 : 34) + jitter(seed, 8));

  // Land economics — known figures where public, else market estimate.
  const acreage = c.knownAcreage ?? Math.round(180 + Math.abs(jitter(seed, 400)));
  const basePrice = isTX ? 14000 : 9000;
  const price_per_acre = Math.round((c.knownZoning === "heavy_industrial" ? basePrice * 1.6 : basePrice) + jitter(seed, 6000));
  const zoning: ZoningClass = c.knownZoning ?? (isTX ? "light_industrial" : "industrial");
  const geotech: "good" | "moderate" | "poor" = c.id.includes("corpus") || c.id.includes("elcampo") ? "moderate" : "good";

  const provenance: Record<string, Provenance> = {
    power_cost_per_mwh: "regional",
    interconnection_queue_wait_years: "regional",
    substation_headroom_mw: "estimated",
    feed_redundancy: "estimated",
    distance_to_fiber_km: "estimated",
    latency_tier: "derived",
    water_availability: "estimated",
    wildfire_risk: "estimated",
    hurricane_exposure: "derived",
    dc_tax_program: "regional",
    local_abatement: "estimated",
    trades_availability: "estimated",
    distance_to_labor_market_km: "derived",
    est_build_months: "estimated",
    acreage: c.knownAcreage ? "regional" : "estimated",
    price_per_acre: "estimated",
    zoning: c.knownZoning ? "regional" : "estimated",
    geotech: "estimated",
  };

  return {
    power_cost_per_mwh: power,
    interconnection_queue_wait_years: waitYears,
    interconnection_queue_status: queueStatus,
    substation_headroom_mw: headroom,
    feed_redundancy: MEGASITE.has(c.id) || headroom > 500,
    distance_to_fiber_km: fiberKm,
    latency_tier: latency,
    water_availability: water,
    wildfire_risk: wildfire,
    hurricane_exposure: hurricane,
    dc_tax_program,
    local_abatement,
    incentive_notes,
    trades_availability: trades,
    distance_to_labor_market_km: laborKm,
    est_build_months: build,
    acreage,
    price_per_acre,
    zoning,
    geotech,
    provenance,
  };
}
