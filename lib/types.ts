export type PipelineStage =
  | "sourced"
  | "diligence"
  | "loi"
  | "under_contract"
  | "closed";

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "sourced", label: "Sourced" },
  { id: "diligence", label: "Diligence" },
  { id: "loi", label: "LOI" },
  { id: "under_contract", label: "Under Contract" },
  { id: "closed", label: "Closed" },
];

export type ZoningClass =
  | "heavy_industrial"
  | "industrial"
  | "light_industrial"
  | "agricultural"
  | "mixed";

export type Tier = "very_low" | "low" | "moderate" | "high";
export type Availability = "abundant" | "high" | "moderate" | "limited";
export type FloodZone = "X" | "shaded_x" | "ae" | "ve";

export interface Site {
  id: string;
  name: string;
  state: "TX" | "NY";
  county: string;
  lat: number;
  lng: number;

  // Land
  acreage: number;
  price_per_acre: number;
  zoning: ZoningClass;
  geotech: "good" | "moderate" | "poor";

  // Power & interconnection
  distance_to_substation_km: number;
  substation_headroom_mw: number;
  interconnection_queue_status: string;
  interconnection_queue_wait_years: number;
  power_cost_per_mwh: number;
  feed_redundancy: boolean;
  iso: "ERCOT" | "NYISO";

  // Connectivity
  distance_to_fiber_km: number;
  distance_to_ix_km: number;
  latency_tier: 1 | 2 | 3;

  // Cooling & climate
  wet_bulb_temp_avg_c: number;
  ambient_temp_avg_c: number;
  water_availability: Availability;

  // Risk
  seismic_risk_tier: Tier;
  flood_zone: FloodZone;
  wildfire_risk: Tier;
  hurricane_exposure: Tier;

  // Incentives
  opportunity_zone: boolean;
  dc_tax_program: "eligible_strong" | "eligible" | "under_review" | "none";
  local_abatement: "yes" | "likely" | "no";
  incentive_notes: string;

  // Labor & construction
  trades_availability: Availability;
  distance_to_labor_market_km: number;
  est_build_months: number;

  // Provenance
  data_note: string;
  /** Per-field data provenance, set by the ingestion pipeline. */
  provenance?: Partial<Record<string, Provenance>>;
  /** Which external sources contributed to this record. */
  sources?: string[];
}

export type Provenance = "measured" | "derived" | "regional" | "estimated";

export const PROVENANCE_META: Record<Provenance, { label: string; color: string; hint: string }> = {
  measured: { label: "Measured", color: "#2f7d4f", hint: "Read from a public dataset at this location" },
  derived: { label: "Derived", color: "#3b6b8f", hint: "Computed from measured public data, such as wet-bulb from temperature and humidity" },
  regional: { label: "Regional", color: "#6b5b8a", hint: "A published figure at ISO, state, or zone level, applied to this site" },
  estimated: { label: "Estimated", color: "#b3612a", hint: "An estimate based on the location, used where no free parcel-level feed exists" },
};
