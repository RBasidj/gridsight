import snapshot from "@/data/sites.snapshot.json";
import type { ScoredSite } from "./scoring";

export interface Snapshot {
  generatedAt: string;
  count: number;
  provenanceCounts: Record<string, number>;
  sites: ScoredSite[];
}

export const SNAPSHOT = snapshot as unknown as Snapshot;
export const SITES: ScoredSite[] = SNAPSHOT.sites;

export function getSite(id: string): ScoredSite | undefined {
  return SITES.find((s) => s.id === id);
}
