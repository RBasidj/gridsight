// Live public-data source adapters. Every adapter is defensive: on any failure
// it returns a labeled fallback so the pipeline always yields a complete record.
import { getJSON, haversineKm, wetBulbC } from "./util";
import type { Provenance, Tier, FloodZone } from "../../lib/types";

// --- Power: nearest electric substation (national HIFLD-derived, ArcGIS) -----
// 77,946 US substations >=69kV, WGS84 point geometry (fields: NAME, STATE, TYPE).
const HIFLD_SUBSTATIONS =
  "https://services6.arcgis.com/OO2s4OoyCZkYJ6oE/arcgis/rest/services/Substations/FeatureServer/0/query";

export async function nearestSubstationKm(lat: number, lng: number): Promise<{ km: number; prov: Provenance }> {
  try {
    const d = 0.6; // ~65 km bbox
    const url =
      `${HIFLD_SUBSTATIONS}?where=1%3D1&geometry=${lng - d},${lat - d},${lng + d},${lat + d}` +
      `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=NAME&returnGeometry=true&outSR=4326&f=json`;
    const j = await getJSON(url);
    const feats: any[] = j.features ?? [];
    if (!feats.length) throw new Error("no substations in bbox");
    let best = Infinity;
    for (const f of feats) {
      const g = f.geometry;
      if (g && typeof g.x === "number") best = Math.min(best, haversineKm(lat, lng, g.y, g.x));
    }
    if (!isFinite(best)) throw new Error("no geometry");
    return { km: Math.round(best * 10) / 10, prov: "measured" };
  } catch {
    return { km: 6.5, prov: "estimated" };
  }
}

// --- Climate: Open-Meteo archive → ambient mean + summer wet-bulb -----------
export async function climate(lat: number, lng: number): Promise<{
  ambient: number; wetBulb: number; prov: Provenance;
}> {
  try {
    const annual = await getJSON(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
        `&start_date=2023-01-01&end_date=2023-12-31&daily=temperature_2m_mean&timezone=auto`
    );
    const temps: number[] = (annual.daily?.temperature_2m_mean ?? []).filter((x: number) => x != null);
    const ambient = temps.reduce((a, b) => a + b, 0) / (temps.length || 1);

    const summer = await getJSON(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
        `&start_date=2023-06-01&end_date=2023-08-31&hourly=temperature_2m,relative_humidity_2m&timezone=auto`
    );
    const st: number[] = summer.hourly?.temperature_2m ?? [];
    const sh: number[] = summer.hourly?.relative_humidity_2m ?? [];
    const n = Math.min(st.length, sh.length) || 1;
    let mt = 0, mh = 0;
    for (let i = 0; i < n; i++) { mt += st[i]; mh += sh[i]; }
    const wb = wetBulbC(mt / n, mh / n);
    return { ambient: Math.round(ambient * 10) / 10, wetBulb: Math.round(wb * 10) / 10, prov: "derived" };
  } catch {
    return { ambient: 18, wetBulb: 22, prov: "estimated" };
  }
}

// --- Seismic: USGS Design Maps (ASCE 7-16) → SDS → SDC tier -----------------
export async function seismic(lat: number, lng: number): Promise<{ tier: Tier; sds: number | null; prov: Provenance }> {
  try {
    const j = await getJSON(
      `https://earthquake.usgs.gov/ws/designmaps/asce7-16.json?latitude=${lat}&longitude=${lng}` +
        `&riskCategory=III&siteClass=D&title=GridSight`
    );
    const sds: number = j?.response?.data?.sds;
    if (sds == null) throw new Error("no sds");
    const tier: Tier = sds < 0.167 ? "very_low" : sds < 0.33 ? "low" : sds < 0.5 ? "moderate" : "high";
    return { tier, sds: Math.round(sds * 1000) / 1000, prov: "measured" };
  } catch {
    return { tier: "low", sds: null, prov: "estimated" };
  }
}

// --- Flood: FEMA National Flood Hazard Layer (NFHL) point query -------------
export async function floodZone(lat: number, lng: number): Promise<{ zone: FloodZone; raw: string; prov: Provenance }> {
  try {
    const url =
      `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query` +
      `?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY&returnGeometry=false&f=json`;
    const j = await getJSON(url);
    const a = j.features?.[0]?.attributes;
    if (!a) return { zone: "X", raw: "Unmapped / minimal", prov: "estimated" };
    const fz: string = (a.FLD_ZONE ?? "X").toUpperCase();
    const sub: string = (a.ZONE_SUBTY ?? "").toUpperCase();
    let zone: FloodZone = "X";
    if (fz.startsWith("V")) zone = "ve";
    else if (["A", "AE", "AH", "AO", "AR"].some((z) => fz === z || fz.startsWith("A"))) zone = "ae";
    else if (fz === "X" && sub.includes("0.2")) zone = "shaded_x";
    else zone = "X";
    return { zone, raw: `${fz}${sub ? " (" + sub + ")" : ""}`, prov: "measured" };
  } catch {
    return { zone: "X", raw: "Unmapped / minimal", prov: "estimated" };
  }
}

// --- Connectivity: nearest PeeringDB facility (proxy for interconnection) ----
const pdbCache = new Map<string, { lat: number; lng: number }[]>();
async function pdbFacilities(state: string): Promise<{ lat: number; lng: number }[]> {
  if (pdbCache.has(state)) return pdbCache.get(state)!;
  try {
    const j = await getJSON(`https://www.peeringdb.com/api/fac?country=US&state=${state}`);
    const facs = (j.data ?? [])
      .filter((f: any) => f.latitude != null && f.longitude != null)
      .map((f: any) => ({ lat: f.latitude, lng: f.longitude }));
    pdbCache.set(state, facs);
    return facs;
  } catch {
    pdbCache.set(state, []);
    return [];
  }
}
export async function nearestIXKm(lat: number, lng: number, state: string): Promise<{ km: number; prov: Provenance }> {
  const facs = await pdbFacilities(state);
  if (!facs.length) return { km: 180, prov: "estimated" };
  let best = Infinity;
  for (const f of facs) best = Math.min(best, haversineKm(lat, lng, f.lat, f.lng));
  return { km: Math.round(best), prov: "measured" };
}

// --- Incentives: Opportunity Zone point-in-polygon (HUD Open Data, ArcGIS) ---
const OZ_LAYER =
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/13/query";
export async function opportunityZone(lat: number, lng: number): Promise<{ isOZ: boolean; prov: Provenance }> {
  try {
    const url =
      `${OZ_LAYER}?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects&returnGeometry=false&returnCountOnly=true&f=json`;
    const j = await getJSON(url);
    const count = j.count ?? j.features?.length ?? 0;
    return { isOZ: count > 0, prov: "measured" };
  } catch {
    return { isOZ: false, prov: "estimated" };
  }
}
