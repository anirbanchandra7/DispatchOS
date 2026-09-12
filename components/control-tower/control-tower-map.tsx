"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEPOT_LOCATION } from "@/lib/geo-dubai";
import { OSM_RASTER_STYLE } from "@/lib/map-style";
import type { DriverMarker } from "@/lib/actions/control-tower";

const MARKER_COLORS: Record<DriverMarker["markerColor"], string> = {
  green: "#16a34a",
  blue: "#2563eb",
  orange: "#f59e0b",
  red: "#dc2626",
  grey: "#9ca3af",
};

export function ControlTowerMap({ markers, onSelect }: { markers: DriverMarker[]; onSelect: (driverId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new MapLibreMap({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: [DEPOT_LOCATION.lng, DEPOT_LOCATION.lat],
      zoom: 11.5,
    });
    mapRef.current.addControl(new NavigationControl({ showCompass: false }), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      // Marker instances belong to the map instance being destroyed above
      // (dev-mode Strict Mode mounts effects twice); drop the refs so the
      // marker effect recreates them against the fresh map instead of
      // silently no-op'ing setLngLat calls on now-defunct markers.
      markerRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    markers.forEach((m) => {
      seen.add(m.id);
      let marker = markerRefs.current.get(m.id);
      if (!marker) {
        const el = document.createElement("div");
        el.className = "ct-marker";
        el.addEventListener("click", () => onSelect(m.id));
        marker = new Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
        markerRefs.current.set(m.id, marker);
      } else {
        marker.setLngLat([m.lng, m.lat]);
      }
      const el = marker.getElement();
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.15)";
      el.style.cursor = "pointer";
      el.style.background = MARKER_COLORS[m.markerColor];
      el.title = `${m.fullName} · ${m.status}`;
    });

    markerRefs.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove();
        markerRefs.current.delete(id);
      }
    });
  }, [markers, onSelect]);

  return <div ref={containerRef} className="h-full w-full rounded-xl overflow-hidden" />;
}
