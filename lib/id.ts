import { v4 as uuidv4 } from "uuid";

export function newId(): string {
  return uuidv4();
}

let orderSeq = 10000;
export function nextExternalOrderId(platform: "UBER_EATS" | "DELIVEROO"): string {
  orderSeq += 1;
  return platform === "UBER_EATS" ? `UE-${orderSeq}` : `DLV-${orderSeq}`;
}
