import briefsSnapshot from "@/data/briefs.snapshot.json";
import { templatedBrief } from "./brief";
import type { ScoredSite } from "./scoring";

const snap = briefsSnapshot as { model: string | null; briefs: Record<string, string> };

/** Read the per-site brief straight from the committed snapshot. Falls back to
 *  the templated brief if a site has no cached entry. No network call. */
export function getBrief(site: ScoredSite): { text: string; source: "claude" | "templated" } {
  const cached = snap.briefs[site.id];
  if (cached) return { text: cached, source: snap.model ? "claude" : "templated" };
  return { text: templatedBrief(site), source: "templated" };
}
