"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, LngLatBounds, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { OSM_RASTER_STYLE } from "@/lib/map-style";
import type { GeoPoint } from "@/types";

interface DriverRouteMapProps {
  driverPosition: GeoPoint;
  destination: GeoPoint;
  destinationLabel: string;
  routePoints: GeoPoint[];
}

const ROUTE_SOURCE_ID = "driver-route";
const ROUTE_LAYER_ID = "driver-route-line";

export function DriverRouteMap({ driverPosition, destination, destinationLabel, routePoints }: DriverRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: [driverPosition.lng, driverPosition.lat],
      zoom: 13,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2563eb", "line-width": 4, "line-dasharray": [0.2, 1.5] },
      });
    });

    const driverEl = document.createElement("div");
    driverEl.className = "driver-route-marker";
    driverEl.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)";
    driverMarkerRef.current = new Marker({ element: driverEl }).setLngLat([driverPosition.lng, driverPosition.lat]).addTo(map);

    const destEl = document.createElement("div");
    destEl.style.cssText =
      "width:14px;height:14px;border-radius:3px;background:#16a34a;border:3px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.2)";
    destMarkerRef.current = new Marker({ element: destEl }).setLngLat([destination.lng, destination.lat]).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
      destMarkerRef.current = null;
      hasFitBoundsRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    driverMarkerRef.current?.setLngLat([driverPosition.lng, driverPosition.lat]);
  }, [driverPosition.lat, driverPosition.lng]);

  useEffect(() => {
    destMarkerRef.current?.setLngLat([destination.lng, destination.lat]);
  }, [destination.lat, destination.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || routePoints.length === 0) return;

    const applyRoute = () => {
      const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: routePoints.map((p) => [p.lng, p.lat]) },
      });

      if (!hasFitBoundsRef.current) {
        const bounds = routePoints.reduce(
          (b, p) => b.extend([p.lng, p.lat]),
          new LngLatBounds([routePoints[0].lng, routePoints[0].lat], [routePoints[0].lng, routePoints[0].lat]),
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
        hasFitBoundsRef.current = true;
      }
    };

    if (map.isStyleLoaded()) applyRoute();
    else map.once("load", applyRoute);
  }, [routePoints]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 rounded-md bg-card/95 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm border">
        Heading to {destinationLabel}
      </div>
    </div>
  );
}
