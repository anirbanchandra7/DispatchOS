import type { StyleSpecification } from "maplibre-gl";

/**
 * Free OpenStreetMap raster tiles - no API key required. Shared by every
 * MapLibre instance in the app (Control Tower, driver route map) so there's
 * one place to swap in Mapbox or another provider later (see README).
 */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
