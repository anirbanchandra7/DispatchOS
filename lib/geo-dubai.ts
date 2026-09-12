import type { GeoPoint } from "@/types";

// Approximate real-world coordinates for well-known Dubai areas, used to
// generate realistic mock addresses, pickup points and delivery routes.
export const DUBAI_AREAS: { name: string; center: GeoPoint }[] = [
  { name: "Business Bay", center: { lat: 25.1857, lng: 55.2762 } },
  { name: "Downtown Dubai", center: { lat: 25.1972, lng: 55.2744 } },
  { name: "JLT", center: { lat: 25.0693, lng: 55.1416 } },
  { name: "Al Quoz", center: { lat: 25.1372, lng: 55.2278 } },
  { name: "Dubai Marina", center: { lat: 25.0805, lng: 55.1403 } },
  { name: "Deira", center: { lat: 25.2697, lng: 55.3095 } },
  { name: "Al Garhoud", center: { lat: 25.2436, lng: 55.3444 } },
  { name: "DIFC", center: { lat: 25.2138, lng: 55.2822 } },
  { name: "Karama", center: { lat: 25.2455, lng: 55.3053 } },
];

export const DEPOT_LOCATION: GeoPoint = { lat: 25.1857, lng: 55.2762 }; // Business Bay depot

const STREET_NAMES = [
  "Sheikh Zayed Road",
  "Al Wasl Road",
  "Marasi Drive",
  "Jumeirah Beach Road",
  "Al Khail Road",
  "Financial Centre Road",
  "Baniyas Road",
  "Al Diyafah Street",
  "Al Satwa Road",
  "Za'abeel Road",
];

export function randomAreaPoint(area: { name: string; center: GeoPoint }, jitterKm = 1.2): GeoPoint {
  const jitterLat = (Math.random() - 0.5) * (jitterKm / 111);
  const jitterLng = (Math.random() - 0.5) * (jitterKm / (111 * Math.cos((area.center.lat * Math.PI) / 180)));
  return { lat: area.center.lat + jitterLat, lng: area.center.lng + jitterLng };
}

export function randomDubaiAddress(area: { name: string; center: GeoPoint }): string {
  const bldg = 100 + Math.floor(Math.random() * 900);
  const street = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  const floor = 1 + Math.floor(Math.random() * 30);
  return `Apt ${floor}0${1 + Math.floor(Math.random() * 8)}, Building ${bldg}, ${street}, ${area.name}, Dubai`;
}

export function pickRandomArea(): { name: string; center: GeoPoint } {
  return DUBAI_AREAS[Math.floor(Math.random() * DUBAI_AREAS.length)];
}

const RESTAURANT_NAMES = [
  "Al Mallah Grill",
  "Ravi Restaurant",
  "Zaroob Kitchen",
  "Bu Qtair Seafood",
  "Salt Burger Co.",
  "Karak House",
  "Bikanervala",
  "Tashas Cafe",
  "Wild & The Moon",
  "Operation Falafel",
];

export function randomRestaurantName(): string {
  return RESTAURANT_NAMES[Math.floor(Math.random() * RESTAURANT_NAMES.length)];
}
