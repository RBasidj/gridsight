// Build-time concept-render generator.
//
// For each site: pull a real USGS NAIP aerial still (public domain, so it is
// clean to feed to an image model and to cache), then ask OpenAI's image model
// to render the concept campus onto that real parcel. Outputs are committed to
// public/ and served statically, so the deployed site makes no live image calls.
//
// Env (.env.local): OPENAI_API_KEY. Optional: OPENAI_IMAGE_MODEL (default
// gpt-image-2), RENDER_QUALITY (low|medium|high, default high), RENDER_LIMIT,
// RENDER_FORCE=1 to regenerate existing renders.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import OpenAI, { toFile } from "openai";
import { loadEnvLocal } from "../ingest/util";
import { computeBlueprint, defaultParams, renderPrompt } from "../../lib/blueprint";
import type { ScoredSite } from "../../lib/scoring";

loadEnvLocal();

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const QUALITY = (process.env.RENDER_QUALITY || "high") as "low" | "medium" | "high";
const LIMIT = process.env.RENDER_LIMIT ? parseInt(process.env.RENDER_LIMIT) : Infinity;
const FORCE = process.env.RENDER_FORCE === "1";

const R = 6378137; // Web Mercator radius

/** USGS NAIP aerial still centered on lat/lng, frame in true ground meters. */
function naipUrl(lat: number, lng: number, frameMeters = 1100, px = 1024): string {
  const cx = R * ((lng * Math.PI) / 180);
  const cy = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const half = frameMeters / Math.cos((lat * Math.PI) / 180) / 2;
  const bbox = [cx - half, cy - half, cx + half, cy + half].join(",");
  const p = new URLSearchParams({ bbox, bboxSR: "3857", imageSR: "3857", size: `${px},${px}`, format: "jpg", f: "image" });
  return `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?${p}`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    process.stdout.write("No OPENAI_API_KEY in .env.local. Skipping render generation.\n");
    return;
  }
  const openai = new OpenAI();
  const snap = JSON.parse(readFileSync(join(process.cwd(), "data", "sites.snapshot.json"), "utf8"));
  const sites: ScoredSite[] = snap.sites;

  const renderDir = join(process.cwd(), "public", "renders");
  const satDir = join(process.cwd(), "public", "satellite");
  mkdirSync(renderDir, { recursive: true });
  mkdirSync(satDir, { recursive: true });

  const manifestPath = join(process.cwd(), "data", "renders.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { generatedAt: null, model: null, renders: {} };

  let done = 0;
  for (const site of sites) {
    if (done >= LIMIT) break;
    const outFile = `${site.id}.webp`;
    const outPath = join(renderDir, outFile);
    if (existsSync(outPath) && !FORCE) {
      process.stdout.write(`  skip ${site.name} (cached)\n`);
      continue;
    }

    try {
      // 1. Real satellite still (public domain NAIP).
      const res = await fetch(naipUrl(site.lat, site.lng), { headers: { "User-Agent": "GridSight/0.1" } });
      if (!res.ok) throw new Error(`NAIP ${res.status}`);
      const satBuf = Buffer.from(await res.arrayBuffer());
      const satFile = `${site.id}.jpg`;
      writeFileSync(join(satDir, satFile), satBuf);

      // 2. Concept render onto the real parcel.
      const bp = computeBlueprint(site, defaultParams(site));
      const image = await toFile(satBuf, "satellite.jpg", { type: "image/jpeg" });
      const gen = await openai.images.edit({
        model: MODEL,
        image,
        prompt: renderPrompt(site, bp),
        size: "1536x1024",
        quality: QUALITY,
        output_format: "webp",
      } as any);
      const b64 = gen.data?.[0]?.b64_json;
      if (!b64) throw new Error("no image returned");
      writeFileSync(outPath, Buffer.from(b64, "base64"));

      manifest.renders[site.id] = { file: outFile, satellite: satFile, generatedAt: new Date().toISOString() };
      manifest.model = MODEL;
      done++;
      process.stdout.write(`  ✓ ${site.name} (${done})\n`);

      // Tier-1 image rate limit is ~5/min; throttle.
      await new Promise((r) => setTimeout(r, 12000));
    } catch (e: any) {
      process.stdout.write(`  ! ${site.name} — ${e?.message ?? e}\n`);
    }
  }

  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  process.stdout.write(`\n✔ ${done} renders written to public/renders (model ${MODEL}, ${QUALITY})\n`);
}

main();
