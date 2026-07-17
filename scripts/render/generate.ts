// Build-time concept-render generator.
//
// For each site: pull a real USGS NAIP aerial still (public domain, so it is
// clean to feed to an image model and to cache), then ask OpenAI's image model
// to render the concept campus onto that real parcel. Outputs are committed to
// public/ and served statically, so the deployed site makes no live image calls.
//
// Env (.env.local): OPENAI_API_KEY. Optional: OPENAI_IMAGE_MODEL (default
// gpt-image-2), RENDER_QUALITY (low|medium|high, default medium), RENDER_LIMIT
// (cap new renders per run; 0 just rebuilds the manifest), RENDER_FORCE=1 to
// regenerate existing renders.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import OpenAI, { toFile } from "openai";
import { loadEnvLocal } from "../ingest/util";
import { computeBlueprint, defaultParams, renderPrompt } from "../../lib/blueprint";
import type { ScoredSite } from "../../lib/scoring";

loadEnvLocal();

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const QUALITY = (process.env.RENDER_QUALITY || "medium") as "low" | "medium" | "high";
const LIMIT = process.env.RENDER_LIMIT !== undefined ? parseInt(process.env.RENDER_LIMIT) : Infinity;
const FORCE = process.env.RENDER_FORCE === "1";
const THROTTLE_MS = process.env.RENDER_THROTTLE ? parseInt(process.env.RENDER_THROTTLE) : 4000;

const R = 6378137; // Web Mercator radius
const ROOT = process.cwd();
const RENDER_DIR = join(ROOT, "public", "renders");
const SAT_DIR = join(ROOT, "public", "satellite");
const MANIFEST = join(ROOT, "data", "renders.json");

/** USGS NAIP aerial still centered on lat/lng, frame in true ground meters. */
function naipUrl(lat: number, lng: number, frameMeters = 1100, px = 1024): string {
  const cx = R * ((lng * Math.PI) / 180);
  const cy = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
  const half = frameMeters / Math.cos((lat * Math.PI) / 180) / 2;
  const bbox = [cx - half, cy - half, cx + half, cy + half].join(",");
  const p = new URLSearchParams({ bbox, bboxSR: "3857", imageSR: "3857", size: `${px},${px}`, format: "jpg", f: "image" });
  return `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?${p}`;
}

function existingRender(id: string): string | null {
  for (const ext of ["jpg", "webp", "png"]) {
    if (existsSync(join(RENDER_DIR, `${id}.${ext}`))) return `${id}.${ext}`;
  }
  return null;
}

function loadManifest() {
  return existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, "utf8"))
    : { generatedAt: null, model: null, renders: {} };
}
function saveManifest(m: any) {
  m.generatedAt = new Date().toISOString();
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
}

async function main() {
  mkdirSync(RENDER_DIR, { recursive: true });
  mkdirSync(SAT_DIR, { recursive: true });
  const snap = JSON.parse(readFileSync(join(ROOT, "data", "sites.snapshot.json"), "utf8"));
  const sites: ScoredSite[] = snap.sites;
  const manifest = loadManifest();

  // Rebuild the manifest from whatever renders already exist on disk, so an
  // interrupted run is never lost and the app can see finished images.
  let recovered = 0;
  for (const site of sites) {
    const file = existingRender(site.id);
    if (file && !manifest.renders[site.id]) {
      const sat = existsSync(join(SAT_DIR, `${site.id}.jpg`)) ? `${site.id}.jpg` : undefined;
      manifest.renders[site.id] = { file, satellite: sat, generatedAt: new Date().toISOString() };
      recovered++;
    }
  }
  if (recovered) manifest.model = manifest.model ?? MODEL;
  saveManifest(manifest);
  process.stdout.write(`recovered ${recovered} existing render(s) into the manifest\n`);

  if (!process.env.OPENAI_API_KEY) {
    process.stdout.write("No OPENAI_API_KEY in .env.local. Manifest rebuilt; skipping generation.\n");
    return;
  }
  const openai = new OpenAI();

  let done = 0;
  for (const site of sites) {
    if (done >= LIMIT) break;
    if (existingRender(site.id) && !FORCE) continue;

    try {
      const res = await fetch(naipUrl(site.lat, site.lng), { headers: { "User-Agent": "GridSight/0.1" } });
      if (!res.ok) throw new Error(`NAIP ${res.status}`);
      const satBuf = Buffer.from(await res.arrayBuffer());
      writeFileSync(join(SAT_DIR, `${site.id}.jpg`), satBuf);

      const bp = computeBlueprint(site, defaultParams(site));
      const image = await toFile(satBuf, "satellite.jpg", { type: "image/jpeg" });
      const gen = await openai.images.edit({
        model: MODEL,
        image,
        prompt: renderPrompt(site, bp),
        size: "1536x1024",
        quality: QUALITY,
        output_format: "jpeg",
      } as any);
      const b64 = gen.data?.[0]?.b64_json;
      if (!b64) throw new Error("no image returned");

      const file = `${site.id}.jpg`;
      writeFileSync(join(RENDER_DIR, file), Buffer.from(b64, "base64"));
      manifest.renders[site.id] = { file, satellite: `${site.id}.jpg`, generatedAt: new Date().toISOString() };
      manifest.model = MODEL;
      saveManifest(manifest); // incremental: safe to interrupt
      done++;
      process.stdout.write(`  ✓ ${site.name} (${done})\n`);
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    } catch (e: any) {
      process.stdout.write(`  ! ${site.name} — ${e?.message ?? e}\n`);
      // On a rate-limit, wait and continue.
      if (/429|rate/i.test(String(e?.message))) await new Promise((r) => setTimeout(r, 30000));
    }
  }

  process.stdout.write(`\n✔ ${done} new render(s); ${Object.keys(manifest.renders).length} total (model ${MODEL}, ${QUALITY})\n`);
}

main();
