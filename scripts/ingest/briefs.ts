// Build-time generator for per-site rationale briefs. If ANTHROPIC_API_KEY is
// set, each brief is written by Claude and cached; otherwise a deterministic
// templated brief is used. Output is committed and served statically — the live
// app never calls the Anthropic API.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { templatedBrief } from "../../lib/brief";
import type { ScoredSite } from "../../lib/scoring";
import { loadEnvLocal } from "./util";

loadEnvLocal();

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function prompt(site: ScoredSite): string {
  const cats = site.categories.map((c) => `${c.label}: ${c.score}/100`).join("; ");
  return [
    `Write a short screening note (120 to 170 words, three plain paragraphs, no headings or bullet points) for a team weighing this parcel for a GPU data center.`,
    `Paragraph one: the site's stronger points. Paragraph two: the real risks. Paragraph three: one line on whether to advance it.`,
    `Write like an analyst jotting a note to a colleague. Be specific and use the numbers. Do not invent facts beyond the data, and say when a figure is an estimate rather than measured.`,
    `Style rules: no em dashes. Do not use the words seamless, robust, standout, leverage, unlock, or the phrases "bottom line", "at a glance", or "worth noting". Avoid absolutes like every, always, never, and zero, and avoid superlatives and hype (best, strongest, world-class, unmatched). Understate rather than oversell. Vary sentence length.`,
    ``,
    `SITE: ${site.name}, ${site.county} County, ${site.state} (${site.iso})`,
    `Composite score: ${site.composite}/100`,
    `Category scores: ${cats}`,
    `Substation: ${site.distance_to_substation_km} km away (measured), ~${site.substation_headroom_mw} MW headroom (estimated), $${site.power_cost_per_mwh}/MWh, ~${site.interconnection_queue_wait_years} yr interconnection wait`,
    `Climate: wet-bulb ${site.wet_bulb_temp_avg_c}°C, ambient ${site.ambient_temp_avg_c}°C (derived from NOAA/Open-Meteo)`,
    `Land: ${site.acreage} ac, $${site.price_per_acre}/ac, zoning ${site.zoning}`,
    `Risk: flood ${site.flood_zone} (FEMA), seismic ${site.seismic_risk_tier} (USGS), hurricane ${site.hurricane_exposure}`,
    `Incentives: Opportunity Zone ${site.opportunity_zone ? "yes" : "no"}; ${site.incentive_notes}`,
    `Context: ${site.data_note}`,
  ].join("\n");
}

async function main() {
  const snap = JSON.parse(readFileSync(join(process.cwd(), "data", "sites.snapshot.json"), "utf8"));
  const sites: ScoredSite[] = snap.sites;

  const key = process.env.ANTHROPIC_API_KEY;
  const briefs: Record<string, string> = {};
  let usedClaude = false;

  if (!key) {
    process.stdout.write("No ANTHROPIC_API_KEY — writing templated briefs for all sites.\n");
    for (const s of sites) briefs[s.id] = templatedBrief(s);
  } else {
    const client = new Anthropic({ apiKey: key });
    for (const s of sites) {
      try {
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 400,
          messages: [{ role: "user", content: prompt(s) }],
        });
        const text = msg.content.filter((b) => b.type === "text").map((b: any) => b.text).join("").trim();
        briefs[s.id] = text || templatedBrief(s);
        usedClaude = true;
        process.stdout.write(`  ✓ ${s.name}\n`);
      } catch (e: any) {
        briefs[s.id] = templatedBrief(s);
        process.stdout.write(`  ! ${s.name} — Claude failed (${e?.message ?? e}); used templated\n`);
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    model: usedClaude ? MODEL : null,
    briefs,
  };
  writeFileSync(join(process.cwd(), "data", "briefs.snapshot.json"), JSON.stringify(out, null, 2));
  process.stdout.write(`\n✔ wrote data/briefs.snapshot.json — ${Object.keys(briefs).length} briefs (${usedClaude ? "Claude " + MODEL : "templated"})\n`);
}

main();
