# GridSight

Site suitability scoring for GPU data-center buildout in Texas and New York.

GridSight takes a set of candidate parcels, scores each one on the seven things that decide whether a large GPU cluster can get powered and built, and puts them on a map you can re-rank by changing how much each factor counts. It is scoped to the two states where Fluidstack is building for Anthropic through 2026 (Texas on ERCOT, New York on NYISO), so the sample is close to a real search rather than a generic one.

Most of the scoring inputs come from public government datasets. The pieces with no free parcel-level feed are labeled estimates, and every figure in the app carries a small colored square showing how it was sourced.

## What it does

- Ranks about 20 real candidate locations across TX and NY on a weighted, seven-factor model.
- Lets you move a slider for any factor and re-rank the whole map as you go.
- Opens a per-site panel with a category radar, a table of key figures, a schematic of a possible cluster footprint on the parcel, and a short written read.
- Compares a shortlist of sites across the same rows.
- Tracks shortlisted sites through a small deal pipeline (Sourced, Diligence, LOI, Under contract, Closed).

## The scoring model

Composite score runs 0 to 100, as a weighted sum of seven category scores. The default weights:

| Factor | Weight | What goes into it |
|---|---|---|
| Power & interconnection | 30% | Distance to nearest substation, substation headroom, interconnection queue wait, energy cost, feed redundancy |
| Land | 15% | Acreage against a target footprint, zoning, price per acre, geotechnical readiness |
| Connectivity | 10% | Distance to long-haul fiber, distance to nearest interconnection facility, latency tier |
| Cooling & climate | 15% | Summer wet-bulb, annual ambient temperature, makeup-water availability |
| Risk | 10% | Seismic hazard, flood zone, wildfire, hurricane exposure |
| Incentives | 10% | Opportunity Zone status, state data-center tax program, local abatement |
| Labor & construction | 10% | Skilled trades availability, distance to labor market, estimated build timeline |

Weights are adjustable in the app and rescale to 100%, so you can move one slider without the total drifting.

### Normalization

Each sub-metric is turned into a 0 to 100 score against a fixed reference band, not just ranked within the current sample. That keeps a single site's score meaningful on its own. For example, distance to substation maps the band 0 to 25 km onto 100 down to 0, and summer wet-bulb maps 15 to 28°C onto 100 down to 0. The bands live in `lib/scoring.ts` (the `BANDS` object) and each category combines its sub-metrics with documented within-category weights. Category scores are stored in the snapshot, so changing the top-level weights re-ranks instantly without re-reading any raw data.

## Where the data comes from

Read live from public sources at build time:

| Field | Source |
|---|---|
| Nearest substation | HIFLD national electric substations (ArcGIS FeatureServer) |
| Summer wet-bulb and annual ambient | Open-Meteo archive (NOAA-derived), wet-bulb via the Stull approximation |
| Seismic hazard | USGS Design Maps web service (ASCE 7-16 SDS) |
| Flood zone | FEMA National Flood Hazard Layer |
| Nearest interconnection facility | PeeringDB facilities API |
| Opportunity Zone | HUD Opportunity Zones layer (ArcGIS) |

Labeled estimates, because there is no free parcel-level feed:

- Land price, acreage where not published, and zoning where not published.
- Per-substation headroom (public datasets give substation locations, not spare capacity).
- Interconnection queue wait and energy cost, taken at the ISO or state level and applied to the site.
- Local labor supply and build timeline.

The four provenance labels used in the app:

- **Measured**: read from a public dataset at that location.
- **Derived**: computed from measured data (wet-bulb from temperature and humidity).
- **Regional**: a published figure at ISO, state, or zone level, applied to the site.
- **Estimated**: an estimate based on the location, used where no free feed exists.

## Architecture

The ingestion pipeline runs once and writes a snapshot the app serves at runtime:

```
scripts/ingest/run.ts      pulls live public data, scores each site, writes data/sites.snapshot.json
scripts/ingest/briefs.ts   writes data/briefs.snapshot.json (Claude if a key is set, else templated)
lib/scoring.ts             the scoring model, shared by the pipeline and the live UI
app/                       Next.js App Router pages (overview, map, compare, pipeline)
```

Because scoring and the written briefs are computed at build time and committed, the deployed app makes no live calls to any paid API. Opening the site loads a static dataset. That is the point: a shared demo can be handed to anyone without running up an API bill or exposing a key.

The base map uses MapLibre GL with free CARTO raster tiles and needs no token.

## Running it locally

```bash
npm install
npm run dev
```

That is enough to run the whole app on the committed snapshot. To rebuild the data yourself:

```bash
npm run ingest    # pulls live public data, rewrites data/sites.snapshot.json (no keys needed)
npm run briefs    # rewrites data/briefs.snapshot.json
```

`npm run briefs` uses Claude if `ANTHROPIC_API_KEY` is set in `.env.local`, and falls back to a deterministic templated brief otherwise. Keys are only read by these build scripts and never ship to the client.

## Attribution, and what was left out

The shape of this pipeline (public data into a weighted score into a map and a short write-up) follows the "OpenClaw Reroof" lead-generation guide, repointed from rooftop solar leads to industrial land for compute.

Two parts of that guide were left out on purpose:

- No tracing a parcel back to a named owner. The original guide used corporate filings and profile scraping to put a person behind an LLC. That is not needed to rank land, and it is not built here.
- No automated outreach. The original guide auto-sent a multi-channel cadence. GridSight stops at ranking land. It does not contact anyone.

## From demo to production

What would change to make this an operating tool rather than a demonstration:

- Real parcel data. Swap the estimated land fields for a licensed parcel source (Regrid or county assessor feeds) to get true boundaries, acreage, zoning, and assessed value.
- Real interconnection detail. Pull the ERCOT and NYISO queue reports and match them to the substation, rather than using an ISO-level wait.
- Substation headroom. This needs utility interconnection studies or a paid grid dataset; it is the weakest input today.
- Refresh cadence. Move ingestion to a scheduled job so climate, flood, and queue data stay current.
- Ground-truthing. Have a site-selection engineer review the reference bands and category weights against real deals.

## License

MIT. See [LICENSE](LICENSE).
