"use client";
import type { Blueprint } from "@/lib/blueprint";

// A generated isometric massing of the concept campus. Not to scale, clearly a
// diagram. Building count and cooling reflect the current blueprint. Tile size
// is derived from the scene extent so the whole campus always fits the frame.

function Box({
  x, y, w, d, h, z = 0, ox, oy, tw, th, zh, top, left, right, stroke,
}: {
  x: number; y: number; w: number; d: number; h: number; z?: number;
  ox: number; oy: number; tw: number; th: number; zh: number;
  top: string; left: string; right: string; stroke: string;
}) {
  const p = (X: number, Y: number, Z: number) => `${ox + (X - Y) * tw},${oy + (X + Y) * th - Z * zh}`;
  const topPts = [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)].join(" ");
  const leftPts = [p(x, y + d, z + h), p(x, y + d, z), p(x, y, z), p(x, y, z + h)].join(" ");
  const rightPts = [p(x + w, y, z + h), p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h)].join(" ");
  return (
    <g strokeLinejoin="round">
      <polygon points={leftPts} fill={left} stroke={stroke} strokeWidth="0.6" />
      <polygon points={rightPts} fill={right} stroke={stroke} strokeWidth="0.6" />
      <polygon points={topPts} fill={top} stroke={stroke} strokeWidth="0.6" />
    </g>
  );
}

export default function IsometricMassing({ bp }: { bp: Blueprint }) {
  const halls = Math.max(2, Math.min(6, bp.halls));
  const evap = bp.cooling === "liquid_evap";

  const hallW = 3;
  const hallD = 8;
  const gap = 1.4;
  const startX = 2;
  const gy = 3;

  const groundW = startX + halls * (hallW + gap) + 4;
  const groundD = gy + hallD + 8;

  // Fit the scene: screen width ≈ (groundW+groundD)*tw, keep it under ~460px.
  const span = groundW + groundD;
  const VW = 500;
  const VH = 300;
  const tw = Math.min(24, 452 / span);
  const th = tw / 2;
  const zh = tw * 0.42;
  const maxZ = 3;
  const ox = groundD * tw + (VW - span * tw) / 2;
  const oy = maxZ * zh + 22;

  const pt = (X: number, Y: number, Z: number) => `${ox + (X - Y) * tw},${oy + (X + Y) * th - Z * zh}`;
  const ground = [pt(0, 0, 0), pt(groundW, 0, 0), pt(groundW, groundD, 0), pt(0, groundD, 0)].join(" ");

  const box = (props: any) => <Box {...props} ox={ox} oy={oy} tw={tw} th={th} zh={zh} />;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full">
      {/* parcel ground */}
      <polygon points={ground} fill="#e7e1d3" stroke="#c3b9a4" strokeWidth="1" />
      {Array.from({ length: Math.floor(groundW / 3) }).map((_, i) => (
        <line key={"gx" + i} x1={ox + (i * 3 - 0) * tw} y1={oy + (i * 3 + 0) * th} x2={ox + (i * 3 - groundD) * tw} y2={oy + (i * 3 + groundD) * th} stroke="#d8d1c1" strokeWidth="0.5" />
      ))}

      {/* substation yard (front-left) */}
      {box({ x: 0.5, y: gy + hallD + 1.5, w: 3, d: 3, h: 0.4, top: "#dcd5c6", left: "#c3b9a4", right: "#cec4b0", stroke: "#a99f8a" })}
      {box({ x: 1, y: gy + hallD + 2, w: 0.7, d: 0.7, h: 2.4, top: "#b3612a", left: "#8f4d21", right: "#a1571f", stroke: "#5f3415" })}
      {box({ x: 2.1, y: gy + hallD + 2, w: 0.7, d: 0.7, h: 2.4, top: "#b3612a", left: "#8f4d21", right: "#a1571f", stroke: "#5f3415" })}

      {/* tie line */}
      <line x1={pt(2, gy + hallD + 2, 2.4).split(",")[0]} y1={pt(2, gy + hallD + 2, 2.4).split(",")[1]} x2={pt(startX + 1.5, gy + hallD, 2).split(",")[0]} y2={pt(startX + 1.5, gy + hallD, 2).split(",")[1]} stroke="#b3612a" strokeWidth="1" strokeDasharray="4 3" />

      {/* data halls + cooling */}
      {Array.from({ length: halls }).map((_, i) => {
        const x = startX + i * (hallW + gap);
        return (
          <g key={i}>
            <polygon points={[pt(x + 0.4, gy + 0.6, 0), pt(x + hallW + 0.4, gy + 0.6, 0), pt(x + hallW + 0.4, gy + hallD + 0.6, 0), pt(x + 0.4, gy + hallD + 0.6, 0)].join(" ")} fill="#00000010" />
            {box({ x, y: gy, w: hallW, d: hallD, h: 2, top: "#eef0f2", left: "#b9c1cc", right: "#d3d9e0", stroke: "#8b93a1" })}
            {evap
              ? box({ x: x + 0.3, y: gy - 1.6, w: hallW - 0.6, d: 1, h: 1.1, top: "#c7ced6", left: "#9098a4", right: "#b0b8c2", stroke: "#767e8c" })
              : box({ x: x + 0.3, y: gy - 1.4, w: hallW - 0.6, d: 0.8, h: 0.6, top: "#cfd6dd", left: "#9aa3b0", right: "#b6bdc7", stroke: "#7c8593" })}
          </g>
        );
      })}

      <text x={VW - 8} y={VH - 8} textAnchor="end" fill="#807a6b" fontSize="9" fontFamily="ui-monospace, monospace">
        concept massing · {halls} halls · {evap ? "evaporative" : "dry"} cooling · not to scale
      </text>
    </svg>
  );
}
