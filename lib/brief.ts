import type { ScoredSite } from "./scoring";

/** Deterministic, no-API rationale brief built from the scored site. Used as the
 *  live fallback and whenever no cached Claude brief exists. Written to read like
 *  a person's screening note: plain, hedged where the data is soft, no em dashes. */
export function templatedBrief(site: ScoredSite): string {
  const cats = [...site.categories].sort((a, b) => b.score - a.score);
  const [s1, s2] = cats.slice(0, 2);
  const [w1, w2] = cats.slice(-2).reverse();

  const power = site.categories.find((c) => c.key === "power")!.score;
  const cooling = site.categories.find((c) => c.key === "cooling")!.score;

  const ozLine = site.opportunity_zone ? "It falls inside a federal Opportunity Zone. " : "";

  const verdict =
    site.composite >= 72
      ? "On these numbers it belongs near the top of the diligence list."
      : site.composite >= 60
      ? "Reasonable to hold on the shortlist while stronger sites get worked."
      : "Lower priority for now, worth another look if higher-ranked sites fall through.";

  const p1 =
    `${site.name} is in ${site.county} County (${site.state}, ${site.iso}) and scores ${site.composite} of 100. ` +
    `${site.data_note} Its stronger marks are ${s1.label.toLowerCase()} (${s1.score}) and ${s2.label.toLowerCase()} (${s2.score}). ` +
    `The closest substation is about ${site.distance_to_substation_km} km out, with a rough ${site.substation_headroom_mw} MW of headroom, ` +
    `power near $${site.power_cost_per_mwh} per MWh, and an interconnection wait around ${site.interconnection_queue_wait_years} years.`;

  const p2 =
    `Summer wet-bulb runs about ${site.wet_bulb_temp_avg_c}°C, which caps how many hours the site can lean on free cooling and shapes its PUE. ` +
    `The softer areas are ${w1.label.toLowerCase()} (${w1.score}) and ${w2.label.toLowerCase()} (${w2.score}). ` +
    `FEMA maps it as flood zone ${site.flood_zone.toUpperCase()}, seismic hazard reads ${site.seismic_risk_tier.replace(/_/g, " ")}, ` +
    `and hurricane exposure is ${site.hurricane_exposure.replace(/_/g, " ")}. ${ozLine}${site.incentive_notes}`;

  const p3 =
    `Read together, this is a ${power >= 70 ? "power-favored" : "power-constrained"}, ` +
    `${cooling >= 70 ? "cool-climate" : "warm-climate"} site. ${verdict}`;

  return [p1, "", p2, "", p3].join("\n");
}
