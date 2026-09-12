import { DEPOT_LOCATION } from "@/lib/geo-dubai";
import type { GeoPoint } from "@/types";

/**
 * Builds a simple realistic multi-point polyline from a start to an end
 * point via 1-2 intermediate waypoints, so riders travel along a route
 * rather than a straight line or random jitter.
 */
export function buildRoute(from: GeoPoint, to: GeoPoint, waypointCount = 2): GeoPoint[] {
  const points: GeoPoint[] = [from];
  for (let i = 1; i <= waypointCount; i++) {
    const t = i / (waypointCount + 1);
    const base = {
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    };
    // small perpendicular-ish jitter so the path isn't a perfectly straight line
    const jitter = 0.0025 * (i % 2 === 0 ? 1 : -1) * (0.5 + Math.random());
    points.push({ lat: base.lat + jitter, lng: base.lng - jitter });
  }
  points.push(to);
  return points;
}

/** Full depot -> pickup -> customer route for a delivery lifecycle. */
export function buildDeliveryRoute(pickup: GeoPoint, customer: GeoPoint): GeoPoint[] {
  return buildRoute(pickup, customer, 2);
}

export function buildDepotToPickupRoute(pickup: GeoPoint): GeoPoint[] {
  return buildRoute(DEPOT_LOCATION, pickup, 1);
}
