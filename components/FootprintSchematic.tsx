"use client";
import type { Site } from "@/lib/types";

// A deliberately schematic top-down sketch of a possible GPU-cluster footprint
// on the parcel, with a substation tie-in whose length reflects the measured
// distance to the nearest substation. It is a diagram, not an image of the site.
export default function FootprintSchematic({ site }: { site: Site }) {
  const W = 420;
  const H = 300;

  const parcelSide = Math.max(120, Math.min(220, Math.sqrt(site.acreage) * 6));
  const px = (W - parcelSide) / 2 + 40;
  const py = (H - parcelSide) / 2;

  const halls = Math.max(2, Math.min(6, Math.round(site.acreage / 90)));
  const cols = Math.ceil(Math.sqrt(halls));
  const rows = Math.ceil(halls / cols);
  const pad = 16;
  const gap = 8;
  const hallW = (parcelSide - pad * 2 - gap * (cols - 1)) / cols;
  const hallH = (parcelSide * 0.62 - pad * 2 - gap * (rows - 1)) / rows;

  const subX = 18;
  const subY = py + parcelSide / 2;
  const tieTargetX = px + pad;
  const tieTargetY = py + parcelSide / 2;

  const ink = "#211d17";
  const rule = "#c3b9a4";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-rule bg-paper">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#e6dfcf" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      {/* parcel boundary */}
      <rect x={px} y={py} width={parcelSide} height={parcelSide} fill="none" stroke={ink} strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={px} y={py - 6} fill={ink} fontSize="10" fontFamily="ui-monospace, monospace">
        parcel · {site.acreage.toLocaleString()} ac
      </text>

      {/* GPU halls */}
      {Array.from({ length: halls }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = px + pad + c * (hallW + gap);
        const y = py + pad + r * (hallH + gap);
        return <rect key={i} x={x} y={y} width={hallW} height={hallH} fill="#1f5c3d" fillOpacity="0.14" stroke="#1f5c3d" strokeWidth="1" />;
      })}
      <text x={px + pad} y={py + parcelSide * 0.62 + pad + 6} fill="#524d42" fontSize="9" fontFamily="ui-monospace, monospace">
        {halls} GPU halls (illustrative)
      </text>

      {/* cooling / yard */}
      <rect x={px + pad} y={py + parcelSide * 0.68} width={parcelSide - pad * 2} height={parcelSide * 0.24} fill="none" stroke={rule} strokeWidth="1" strokeDasharray="2 2" />
      <text x={px + pad + 3} y={py + parcelSide * 0.68 + 12} fill="#807a6b" fontSize="8" fontFamily="ui-monospace, monospace">
        cooling yard / substation pad
      </text>

      {/* substation + tie-in */}
      <line x1={subX + 10} y1={subY} x2={tieTargetX} y2={tieTargetY} stroke="#b3612a" strokeWidth="1.5" strokeDasharray="5 3" />
      <rect x={subX} y={subY - 10} width="20" height="20" fill="none" stroke="#b3612a" strokeWidth="1.4" />
      <text x={subX} y={subY - 14} fill="#b3612a" fontSize="9" fontFamily="ui-monospace, monospace">
        substation
      </text>
      <text x={(subX + tieTargetX) / 2 - 22} y={tieTargetY - 6} fill="#b3612a" fontSize="9" fontFamily="ui-monospace, monospace">
        tie-in {site.distance_to_substation_km} km
      </text>

      <text x={W - 8} y={H - 8} textAnchor="end" fill="#807a6b" fontSize="9" fontFamily="ui-monospace, monospace">
        schematic, not to scale
      </text>
    </svg>
  );
}
