"use client";
import { useState } from "react";
import type { ScoredSite } from "@/lib/scoring";
import type { Blueprint } from "@/lib/blueprint";
import rendersManifest from "@/data/renders.json";
import IsometricMassing from "./IsometricMassing";

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";
const manifest = rendersManifest as {
  model: string | null;
  renders: Record<string, { file: string; satellite?: string; generatedAt: string }>;
};

type Mode = "render" | "satellite" | "massing";

// Shows a cached AI concept render for the site when one exists, otherwise the
// generated isometric massing. Always labeled as a concept, never as a photo.
export default function ConceptRender({ site, bp }: { site: ScoredSite; bp: Blueprint }) {
  const render = manifest.renders[site.id];
  const [mode, setMode] = useState<Mode>(render ? "render" : "massing");

  const tab = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`border px-2 py-0.5 text-xs ${mode === m ? "border-forest bg-forest text-paper-raised" : "border-rule-strong text-ink-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1">
          {render && tab("render", "AI render")}
          {render?.satellite && tab("satellite", "Satellite")}
          {tab("massing", "Massing")}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">concept, not a photo</span>
      </div>

      <div className="relative border border-rule bg-paper">
        {mode === "render" && render ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BP}/renders/${render.file}`} alt={`Concept render of a data-center campus at ${site.name}`} className="w-full" />
            <div className="absolute left-0 top-0 bg-paper-raised/85 px-2 py-0.5 font-mono text-[10px] text-ink-muted">
              concept render · {manifest.model ?? "AI"} · on the parcel&apos;s NAIP image
            </div>
          </>
        ) : mode === "satellite" && render?.satellite ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BP}/satellite/${render.satellite}`} alt={`USGS NAIP aerial of ${site.name}`} className="w-full" />
            <div className="absolute left-0 top-0 bg-paper-raised/85 px-2 py-0.5 font-mono text-[10px] text-ink-muted">
              USGS NAIP aerial · public domain
            </div>
          </>
        ) : (
          <IsometricMassing bp={bp} />
        )}
      </div>

      {!render && (
        <p className="mt-2 text-[11px] text-ink-faint">
          No AI render cached for this site yet. Run <span className="font-mono">npm run renders</span> with an OpenAI key
          to generate one on the parcel&apos;s real satellite image.
        </p>
      )}
    </div>
  );
}
