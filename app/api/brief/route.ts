import { NextResponse } from "next/server";
import { getSite } from "@/lib/data";
import { templatedBrief } from "@/lib/brief";
import briefsSnapshot from "@/data/briefs.snapshot.json";

// Serves the per-site rationale brief. Prefers the build-time Claude-generated
// snapshot (cached, zero live cost); falls back to a deterministic templated
// brief. No Anthropic API call is ever made at request time.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const site = getSite(id);
  if (!site) return NextResponse.json({ error: "not found" }, { status: 404 });

  const cached = (briefsSnapshot as { briefs: Record<string, string> }).briefs[id];
  if (cached) return NextResponse.json({ text: cached, source: "claude" });

  return NextResponse.json({ text: templatedBrief(site), source: "templated" });
}
