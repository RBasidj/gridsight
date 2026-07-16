"use client";
import { useMemo, useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { composite, scoreColor, type ScoredSite } from "@/lib/scoring";
import { useApp } from "@/lib/store";

// Free CARTO light raster basemap. No API token required.
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

export default function MapView({ sites }: { sites: ScoredSite[] }) {
  const { weights, selectedId, select } = useApp();
  const [hover, setHover] = useState<ScoredSite | null>(null);

  const scored = useMemo(
    () =>
      sites
        .map((s) => ({ site: s, score: composite(s.categories, weights) }))
        .sort((a, b) => a.score - b.score), // draw high scores last (on top)
    [sites, weights]
  );

  return (
    <Map
      initialViewState={{ longitude: -88, latitude: 37.5, zoom: 3.7 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAP_STYLE}
      preserveDrawingBuffer
      onClick={() => select(null)}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {scored.map(({ site, score }) => {
        const selected = selectedId === site.id;
        const size = 20 + Math.round(score / 6);
        return (
          <Marker
            key={site.id}
            longitude={site.lng}
            latitude={site.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              select(site.id);
            }}
          >
            <div
              onMouseEnter={() => setHover(site)}
              onMouseLeave={() => setHover(null)}
              className="grid cursor-pointer place-items-center font-mono font-semibold text-paper-raised"
              style={{
                width: size,
                height: size,
                fontSize: size > 26 ? 11 : 9,
                backgroundColor: scoreColor(score),
                border: selected ? "2px solid #211d17" : "1px solid rgba(244,241,234,0.85)",
                outline: selected ? "2px solid #1f5c3d" : "none",
                outlineOffset: 1,
                boxShadow: "1px 1px 0 rgba(33,29,23,0.25)",
                zIndex: selected ? 10 : 1,
              }}
            >
              {score}
            </div>
          </Marker>
        );
      })}

      {hover && (
        <Popup
          longitude={hover.lng}
          latitude={hover.lat}
          closeButton={false}
          closeOnClick={false}
          offset={16}
          anchor="bottom"
        >
          <div className="text-xs">
            <div className="font-semibold text-ink">{hover.name}</div>
            <div className="text-ink-muted">
              {hover.county} County, {hover.state}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
