"use client";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { CategoryScore } from "@/lib/scoring";

const SHORT: Record<string, string> = {
  power: "Power",
  land: "Land",
  connectivity: "Connect",
  cooling: "Cooling",
  risk: "Risk",
  incentives: "Incent.",
  labor: "Labor",
};

export default function CategoryRadar({
  categories,
  height = 240,
  color = "#1f5c3d",
}: {
  categories: CategoryScore[];
  height?: number;
  color?: string;
}) {
  const data = categories.map((c) => ({ cat: SHORT[c.key] ?? c.label, score: c.score }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#d8d1c1" />
        <PolarAngleAxis dataKey="cat" tick={{ fill: "#524d42", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke={color} fill={color} fillOpacity={0.22} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
