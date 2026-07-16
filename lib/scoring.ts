import type { Site } from "./types";

// ---------------------------------------------------------------------------
// Scoring model
// ---------------------------------------------------------------------------
// Every sub-metric is normalized to 0–100 against a FIXED reference band
// (documented in the README) so that a single site's score is stable and
// interpretable on its own — not just relative to the current sample set.
// Category scores are weighted composites of their sub-metrics; the overall
// composite is a weighted sum of the 7 category scores. Category weights are
// user-adjustable at runtime; the composite is recomputed client-side from the
// stored category scores, so re-ranking is instant and needs no re-ingestion.
// ---------------------------------------------------------------------------

export type CategoryKey =
  | "power"
  | "land"
  | "connectivity"
  | "cooling"
  | "risk"
  | "incentives"
  | "labor";

export const CATEGORY_META: {
  key: CategoryKey;
  label: string;
  defaultWeight: number;
  blurb: string;
}[] = [
  { key: "power", label: "Power & Interconnection", defaultWeight: 0.3, blurb: "Substation proximity, headroom, queue wait, energy cost, redundancy" },
  { key: "land", label: "Land", defaultWeight: 0.15, blurb: "Acreage vs. footprint, zoning, price per acre, geotechnical readiness" },
  { key: "connectivity", label: "Connectivity", defaultWeight: 0.1, blurb: "Long-haul fiber, distance to internet exchange, latency tier" },
  { key: "cooling", label: "Cooling & Climate", defaultWeight: 0.15, blurb: "Wet-bulb & ambient temperature, makeup-water availability" },
  { key: "risk", label: "Risk", defaultWeight: 0.1, blurb: "Seismic, flood, wildfire and hurricane exposure" },
  { key: "incentives", label: "Incentives", defaultWeight: 0.1, blurb: "Opportunity Zone, state data-center tax program, local abatement" },
  { key: "labor", label: "Labor & Construction", defaultWeight: 0.1, blurb: "Skilled trades availability, labor-market distance, build timeline" },
];

export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = CATEGORY_META.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.defaultWeight }),
  {} as Record<CategoryKey, number>
);

export interface SubScore {
  label: string;
  raw: string; // human-readable raw value + unit
  normalized: number; // 0–100
  weight: number; // weight within the category
}

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number; // 0–100
  subs: SubScore[];
}

export interface ScoredSite extends Site {
  categories: CategoryScore[];
  composite: number; // 0–100, using DEFAULT_WEIGHTS
}

// --- normalization helpers -------------------------------------------------

/** Min–max normalize into 0–100 against a fixed band, clamped. */
function band(value: number, min: number, max: number, invert = false): number {
  if (max === min) return 50;
  let t = (value - min) / (max - min);
  t = Math.max(0, Math.min(1, t));
  if (invert) t = 1 - t;
  return Math.round(t * 100);
}

function fromMap<T extends string>(value: T, map: Record<T, number>): number {
  return map[value] ?? 40;
}

function weighted(subs: SubScore[]): number {
  const total = subs.reduce((s, x) => s + x.weight, 0) || 1;
  return Math.round(subs.reduce((s, x) => s + x.normalized * x.weight, 0) / total);
}

// --- reference bands (documented in README) --------------------------------

export const BANDS = {
  substationKm: [0, 25] as const,
  headroomMw: [0, 1000] as const,
  queueWaitYears: [0, 6] as const,
  powerCost: [20, 80] as const,
  acreage: [50, 400] as const,
  pricePerAcre: [3000, 60000] as const,
  fiberKm: [0, 30] as const,
  ixKm: [0, 400] as const,
  wetBulb: [15, 28] as const,
  ambient: [8, 26] as const,
  laborKm: [0, 120] as const,
  buildMonths: [18, 48] as const,
};

// --- category scorers ------------------------------------------------------

function powerScore(s: Site): CategoryScore {
  const subs: SubScore[] = [
    { label: "Distance to substation", raw: `${s.distance_to_substation_km.toFixed(1)} km`, normalized: band(s.distance_to_substation_km, ...BANDS.substationKm, true), weight: 0.3 },
    { label: "Substation headroom", raw: `${s.substation_headroom_mw} MW`, normalized: band(s.substation_headroom_mw, ...BANDS.headroomMw), weight: 0.3 },
    { label: "Interconnection queue wait", raw: `~${s.interconnection_queue_wait_years} yr (${s.iso})`, normalized: band(s.interconnection_queue_wait_years, ...BANDS.queueWaitYears, true), weight: 0.2 },
    { label: "Energy cost", raw: `$${s.power_cost_per_mwh}/MWh`, normalized: band(s.power_cost_per_mwh, ...BANDS.powerCost, true), weight: 0.15 },
    { label: "Feed redundancy", raw: s.feed_redundancy ? "Dual feed" : "Single feed", normalized: s.feed_redundancy ? 100 : 40, weight: 0.05 },
  ];
  return { key: "power", label: "Power & Interconnection", score: weighted(subs), subs };
}

function landScore(s: Site): CategoryScore {
  const zoningMap = { heavy_industrial: 100, industrial: 85, light_industrial: 62, mixed: 45, agricultural: 35 };
  const geoMap = { good: 92, moderate: 62, poor: 32 };
  const subs: SubScore[] = [
    { label: "Acreage vs. footprint", raw: `${s.acreage.toLocaleString()} ac`, normalized: band(s.acreage, ...BANDS.acreage), weight: 0.3 },
    { label: "Zoning", raw: s.zoning.replace(/_/g, " "), normalized: fromMap(s.zoning, zoningMap), weight: 0.3 },
    { label: "Price per acre", raw: `$${s.price_per_acre.toLocaleString()}`, normalized: band(s.price_per_acre, ...BANDS.pricePerAcre, true), weight: 0.25 },
    { label: "Geotechnical readiness", raw: s.geotech, normalized: fromMap(s.geotech, geoMap), weight: 0.15 },
  ];
  return { key: "land", label: "Land", score: weighted(subs), subs };
}

function connectivityScore(s: Site): CategoryScore {
  const latMap = { 1: 100, 2: 70, 3: 45 };
  const subs: SubScore[] = [
    { label: "Distance to long-haul fiber", raw: `${s.distance_to_fiber_km.toFixed(1)} km`, normalized: band(s.distance_to_fiber_km, ...BANDS.fiberKm, true), weight: 0.4 },
    { label: "Distance to internet exchange", raw: `${s.distance_to_ix_km.toFixed(0)} km`, normalized: band(s.distance_to_ix_km, ...BANDS.ixKm, true), weight: 0.3 },
    { label: "Latency tier to major metro", raw: `Tier ${s.latency_tier}`, normalized: latMap[s.latency_tier], weight: 0.3 },
  ];
  return { key: "connectivity", label: "Connectivity", score: weighted(subs), subs };
}

function coolingScore(s: Site): CategoryScore {
  const waterMap = { abundant: 100, high: 82, moderate: 60, limited: 32 };
  const subs: SubScore[] = [
    { label: "Avg. wet-bulb temperature", raw: `${s.wet_bulb_temp_avg_c.toFixed(1)} °C`, normalized: band(s.wet_bulb_temp_avg_c, ...BANDS.wetBulb, true), weight: 0.45 },
    { label: "Avg. ambient temperature", raw: `${s.ambient_temp_avg_c.toFixed(1)} °C`, normalized: band(s.ambient_temp_avg_c, ...BANDS.ambient, true), weight: 0.25 },
    { label: "Makeup-water availability", raw: s.water_availability, normalized: fromMap(s.water_availability, waterMap), weight: 0.3 },
  ];
  return { key: "cooling", label: "Cooling & Climate", score: weighted(subs), subs };
}

function riskScore(s: Site): CategoryScore {
  const tierMap = { very_low: 100, low: 85, moderate: 58, high: 30 };
  const floodMap = { X: 100, shaded_x: 80, ae: 42, ve: 20 };
  const subs: SubScore[] = [
    { label: "Seismic hazard", raw: s.seismic_risk_tier.replace(/_/g, " "), normalized: fromMap(s.seismic_risk_tier, tierMap), weight: 0.2 },
    { label: "Flood zone", raw: s.flood_zone.toUpperCase().replace("_", " "), normalized: fromMap(s.flood_zone, floodMap), weight: 0.35 },
    { label: "Wildfire risk", raw: s.wildfire_risk.replace(/_/g, " "), normalized: fromMap(s.wildfire_risk, tierMap), weight: 0.2 },
    { label: "Hurricane exposure", raw: s.hurricane_exposure.replace(/_/g, " "), normalized: fromMap(s.hurricane_exposure, tierMap), weight: 0.25 },
  ];
  return { key: "risk", label: "Risk", score: weighted(subs), subs };
}

function incentivesScore(s: Site): CategoryScore {
  const progMap = { eligible_strong: 100, eligible: 80, under_review: 55, none: 25 };
  const localMap = { yes: 100, likely: 70, no: 40 };
  const subs: SubScore[] = [
    { label: "Opportunity Zone", raw: s.opportunity_zone ? "Yes" : "No", normalized: s.opportunity_zone ? 100 : 40, weight: 0.25 },
    { label: "State data-center tax program", raw: s.dc_tax_program.replace(/_/g, " "), normalized: fromMap(s.dc_tax_program, progMap), weight: 0.45 },
    { label: "Local abatement", raw: s.local_abatement, normalized: fromMap(s.local_abatement, localMap), weight: 0.3 },
  ];
  return { key: "incentives", label: "Incentives", score: weighted(subs), subs };
}

function laborScore(s: Site): CategoryScore {
  const availMap = { abundant: 100, high: 82, moderate: 62, limited: 35 };
  const subs: SubScore[] = [
    { label: "Skilled trades availability", raw: s.trades_availability, normalized: fromMap(s.trades_availability, availMap), weight: 0.4 },
    { label: "Distance to labor market", raw: `${s.distance_to_labor_market_km.toFixed(0)} km`, normalized: band(s.distance_to_labor_market_km, ...BANDS.laborKm, true), weight: 0.3 },
    { label: "Est. build timeline", raw: `${s.est_build_months} mo`, normalized: band(s.est_build_months, ...BANDS.buildMonths, true), weight: 0.3 },
  ];
  return { key: "labor", label: "Labor & Construction", score: weighted(subs), subs };
}

const SCORERS: ((s: Site) => CategoryScore)[] = [
  powerScore, landScore, connectivityScore, coolingScore, riskScore, incentivesScore, laborScore,
];

/** Compute all category scores for a site (weights applied at composite time). */
export function scoreSite(site: Site): ScoredSite {
  const categories = SCORERS.map((fn) => fn(site));
  return { ...site, categories, composite: composite(categories, DEFAULT_WEIGHTS) };
}

/** Weighted composite from category scores. Weights are re-normalized to sum 1,
 *  so sliders can be moved independently without the total drifting. */
export function composite(
  categories: CategoryScore[],
  weights: Record<CategoryKey, number>
): number {
  const total = categories.reduce((s, c) => s + (weights[c.key] ?? 0), 0) || 1;
  return Math.round(
    categories.reduce((s, c) => s + c.score * (weights[c.key] ?? 0), 0) / total
  );
}

/** Earthy score ramp, 0–100. Muted on purpose so the map reads like a printed
 *  suitability plate rather than a neon dashboard. */
export function scoreColor(score: number): string {
  if (score >= 80) return "#2f7d4f"; // green
  if (score >= 68) return "#5f8a34"; // olive
  if (score >= 56) return "#a87f22"; // ochre
  if (score >= 44) return "#b3612a"; // clay
  return "#a8382c"; // brick
}
