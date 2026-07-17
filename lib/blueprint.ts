import type { ScoredSite } from "./scoring";

// ---------------------------------------------------------------------------
// Planning-grade engineering model.
//
// Turns a real site plus a few assumptions into a concept build: load, cooling
// approach, footprint, materials, cost, power in/out, and a feasibility read.
// Every constant here is a documented planning figure drawn from public 2026
// benchmarks (JLL/Goldman capex per MW, NVIDIA GB200 NVL72 rack density,
// typical PUE by heat-rejection method). These are estimates for screening, not
// a substitute for an engineering study.
// ---------------------------------------------------------------------------

export type Redundancy = "N" | "N+1" | "2N";
export type CoolingMode = "auto" | "liquid_dry" | "liquid_evap" | "air_econ";
export type CoolingKey = "liquid_dry" | "liquid_evap" | "air_econ";

export interface BlueprintParams {
  itMW: number; // target IT (critical) load in MW
  rackKW: number; // per-rack power
  redundancy: Redundancy;
  cooling: CoolingMode;
  landPricePerAcre?: number; // override the site's figure
}

export const COOLING_META: Record<CoolingKey, { label: string; note: string }> = {
  liquid_dry: {
    label: "Direct-to-chip liquid, dry coolers",
    note: "Closed-loop liquid to the racks, heat rejected through dry coolers. Efficient in cool or water-scarce sites, little makeup water.",
  },
  liquid_evap: {
    label: "Direct-to-chip liquid, evaporative rejection",
    note: "Liquid to the racks with evaporative towers for heat rejection. Lower PUE in warm climates, but it draws real makeup water.",
  },
  air_econ: {
    label: "Rear-door + air-side economization",
    note: "Air cooling with economizer hours from the local climate. Simpler, but harder to hold at very high rack density.",
  },
};

const GPUS_PER_RACK: Record<number, number> = { 40: 32, 130: 72, 600: 144 };

function coolingChoice(site: ScoredSite, mode: CoolingMode): CoolingKey {
  if (mode !== "auto") return mode;
  const wb = site.wet_bulb_temp_avg_c;
  const water = site.water_availability;
  const wetHasWater = water === "abundant" || water === "high";
  if (wb <= 19) return "liquid_dry"; // cool: dry coolers need no water and run efficiently
  return wetHasWater ? "liquid_evap" : "liquid_dry"; // warmer: evap if water is there, else dry

}

function pue(key: CoolingKey, wb: number): number {
  let p: number;
  if (key === "liquid_dry") p = 1.15 + Math.max(0, wb - 14) * 0.008;
  else if (key === "liquid_evap") p = 1.24 + Math.max(0, wb - 24) * 0.004;
  else p = 1.18 + Math.max(0, wb - 12) * 0.01;
  return Math.round(Math.min(1.6, Math.max(1.12, p)) * 100) / 100;
}

const REDUNDANCY_FACTOR: Record<Redundancy, number> = { N: 1.0, "N+1": 1.12, "2N": 1.35 };

export interface CapexLine {
  label: string;
  amount: number; // $M
}

export interface Blueprint {
  params: BlueprintParams;
  cooling: CoolingKey;
  pue: number;
  itMW: number;
  facilityMW: number; // grid draw
  wasteHeatMW: number;
  racks: number;
  gpus: number;
  halls: number;
  whiteSpaceSqft: number;
  buildingGsf: number;
  landAcres: number;
  waterMgd: number; // makeup water, million gallons/day
  timelineMonths: number;
  capex: CapexLine[];
  facilityCapex: number; // $M, sum of capex lines
  facilityCapexPerMW: number; // $M/MW
  itHardware: number; // $M, GPUs/servers (excluded from facility)
  annualEnergy: number; // $M/yr
  feasibility: { ok: boolean; label: string; detail: string }[];
  contractors: { role: string; firms: string }[];
}

export function defaultParams(site: ScoredSite): BlueprintParams {
  const headroomLimited = Math.max(25, Math.floor((site.substation_headroom_mw * 0.8) / 25) * 25);
  return {
    itMW: Math.min(200, headroomLimited),
    rackKW: 130,
    redundancy: "N+1",
    cooling: "auto",
    landPricePerAcre: undefined,
  };
}

export function computeBlueprint(site: ScoredSite, params: BlueprintParams): Blueprint {
  const itMW = Math.max(5, params.itMW);
  const cooling = coolingChoice(site, params.cooling);
  const p = pue(cooling, site.wet_bulb_temp_avg_c);
  const facilityMW = Math.round(itMW * p * 10) / 10;

  const racks = Math.ceil((itMW * 1000) / params.rackKW);
  const gpusPerRack = GPUS_PER_RACK[params.rackKW] ?? 72;
  const gpus = racks * gpusPerRack;
  const halls = Math.max(2, Math.round(itMW / 40));

  const whiteSpaceSqft = Math.round(racks * 42);
  const buildingGsf = Math.round(whiteSpaceSqft / 0.42);
  const buildingAcres = buildingGsf / 43560;
  const landAcres = Math.round(Math.max(buildingAcres * 4, itMW * 0.3));

  const waterMgd = Math.round((cooling === "liquid_evap" ? itMW * 0.014 : itMW * 0.001) * 100) / 100;

  const rf = REDUNDANCY_FACTOR[params.redundancy];
  const perMW = {
    electrical: 7.0 * rf,
    mechanical: cooling === "liquid_evap" ? 3.4 : cooling === "liquid_dry" ? 3.1 : 2.8,
    shell: 2.6,
    sitework: 0.7,
    other: 1.3,
  };
  const price = params.landPricePerAcre ?? site.price_per_acre;
  const land = Math.round((landAcres * price) / 1e6);

  const capex: CapexLine[] = [
    { label: "Land", amount: land },
    { label: "Electrical & power chain", amount: Math.round(perMW.electrical * itMW) },
    { label: "Mechanical & cooling", amount: Math.round(perMW.mechanical * itMW) },
    { label: "Building shell & interiors", amount: Math.round(perMW.shell * itMW) },
    { label: "Sitework & civil", amount: Math.round(perMW.sitework * itMW) },
    { label: "Fire, security, controls", amount: Math.round(perMW.other * itMW) },
  ];
  const facilityCapex = capex.reduce((s, c) => s + c.amount, 0);
  const facilityCapexPerMW = Math.round((facilityCapex / itMW) * 10) / 10;
  const itHardware = Math.round(itMW * 28);
  const annualEnergy = Math.round(((facilityMW * 8760 * site.power_cost_per_mwh) / 1e6) * 10) / 10;

  const timelineMonths = site.est_build_months + Math.round((Math.max(0, itMW - 100) / 100) * 4);

  // Feasibility reads against the real site figures.
  const feasibility = [
    site.substation_headroom_mw >= facilityMW
      ? { ok: true, label: "Power headroom", detail: `${site.substation_headroom_mw} MW estimated headroom covers the ${facilityMW} MW draw.` }
      : { ok: false, label: "Power headroom", detail: `${facilityMW} MW draw exceeds the estimated ${site.substation_headroom_mw} MW headroom; a substation upgrade or phasing would be needed.` },
    site.acreage >= landAcres
      ? { ok: true, label: "Land", detail: `${site.acreage.toLocaleString()} ac parcel fits the ~${landAcres} ac campus.` }
      : { ok: false, label: "Land", detail: `~${landAcres} ac campus is larger than the ${site.acreage.toLocaleString()} ac parcel; scope down or assemble adjacent land.` },
    cooling === "liquid_evap" && (site.water_availability === "limited")
      ? { ok: false, label: "Water", detail: `Evaporative rejection wants ~${waterMgd} MGD, but water is limited here; dry coolers may be the safer call.` }
      : { ok: true, label: "Water", detail: cooling === "liquid_evap" ? `~${waterMgd} MGD makeup water, supported by ${site.water_availability} availability.` : `Dry-cooled, minimal makeup water.` },
    site.interconnection_queue_wait_years <= 3
      ? { ok: true, label: "Interconnection", detail: `~${site.interconnection_queue_wait_years} yr queue is workable for a near-term build.` }
      : { ok: false, label: "Interconnection", detail: `~${site.interconnection_queue_wait_years} yr queue is long; energization timing is the gating risk.` },
  ];

  // Representative firms active in this market (illustrative, not engaged).
  const contractors = [
    { role: "General contractor", firms: "Holder, DPR, Turner, or JE Dunn" },
    { role: "Electrical", firms: "Rosendin or a regional mission-critical EC" },
    { role: "Mechanical / cooling", firms: "a regional mechanical contractor with liquid-cooling experience" },
  ];

  return {
    params: { ...params, itMW },
    cooling,
    pue: p,
    itMW,
    facilityMW,
    wasteHeatMW: facilityMW,
    racks,
    gpus,
    halls,
    whiteSpaceSqft,
    buildingGsf,
    landAcres,
    waterMgd,
    timelineMonths,
    capex,
    facilityCapex,
    facilityCapexPerMW,
    itHardware,
    annualEnergy,
    feasibility,
    contractors,
  };
}

/** Prompt for the image model: a labeled architectural concept render of the
 *  campus this blueprint describes, on the parcel's real setting. */
export function renderPrompt(site: ScoredSite, bp: Blueprint): string {
  const setting =
    site.state === "TX"
      ? "flat Texas terrain with dry grassland and scattered mesquite"
      : "rolling Upstate New York terrain with treelines and green fields";
  const cool =
    bp.cooling === "liquid_evap"
      ? "rows of evaporative cooling towers"
      : bp.cooling === "liquid_dry"
      ? "banks of dry coolers and CDUs"
      : "rooftop air handlers";
  return [
    `Photorealistic architectural concept render, high oblique aerial view, of a proposed hyperscale GPU data-center campus.`,
    `${bp.halls} long metal-clad single-story data halls in a row, total about ${Math.round(bp.buildingGsf / 1000)},000 square feet, light grey standing-seam roofs.`,
    `An on-site electrical substation with transformers and a switchyard connected by overhead lines, ${cool} alongside the buildings, employee parking, and paved access roads.`,
    `Set on ${setting}. Late-afternoon light, clear sky, subtle haze. Clean, modern, industrial.`,
    `This is a design concept and proposal massing, not a photograph of an existing building.`,
  ].join(" ");
}
