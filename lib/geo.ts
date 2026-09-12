import type { GeoPoint } from "@/types";

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function interpolate(a: GeoPoint, b: GeoPoint, t: number): GeoPoint {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

export function bearingDeg(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Total length of a polyline route in km. */
export function routeLengthKm(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/** Position + heading at fractional progress [0,1] along a polyline. */
export function pointAlongRoute(points: GeoPoint[], progress: number): { point: GeoPoint; heading: number } {
  if (points.length === 0) return { point: { lat: 0, lng: 0 }, heading: 0 };
  if (points.length === 1) return { point: points[0], heading: 0 };
  const clamped = Math.max(0, Math.min(1, progress));
  const total = routeLengthKm(points);
  const target = total * clamped;
  let covered = 0;
  for (let i = 1; i < points.length; i++) {
    const segLen = haversineKm(points[i - 1], points[i]);
    if (covered + segLen >= target || i === points.length - 1) {
      const segT = segLen === 0 ? 0 : (target - covered) / segLen;
      return {
        point: interpolate(points[i - 1], points[i], Math.max(0, Math.min(1, segT))),
        heading: bearingDeg(points[i - 1], points[i]),
      };
    }
    covered += segLen;
  }
  return { point: points[points.length - 1], heading: 0 };
}
