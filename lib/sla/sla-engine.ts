import type { Order, SlaInfo, SlaState } from "@/types";

// Configurable SLA thresholds (minutes)
export const SLA_CONFIG = {
  fulfilmentMinutes: 12, // RECEIVED -> READY
  dispatchMinutes: 6, // READY -> DISPATCHED
  deliveryMinutesFromDispatch: 25, // DISPATCHED -> DELIVERED
  atRiskThresholdRatio: 0.3, // remaining fraction below which order is AT_RISK
};

function stateFromRemaining(remainingSeconds: number, totalSeconds: number): SlaState {
  if (remainingSeconds <= 0) return "BREACHED";
  if (remainingSeconds / totalSeconds <= SLA_CONFIG.atRiskThresholdRatio) return "AT_RISK";
  return "ON_TRACK";
}

function formatCountdown(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

/** Overall order SLA: time from order received to requested delivery time. */
export function getOrderSla(order: Order, now: Date = new Date()): SlaInfo {
  if (["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)) {
    return {
      state: order.status === "DELIVERED" ? "ON_TRACK" : "BREACHED",
      deadline: order.requestedDeliveryTime,
      remainingSeconds: 0,
      label: order.status === "DELIVERED" ? "Delivered" : order.status,
    };
  }
  const deadline = new Date(order.requestedDeliveryTime).getTime();
  const created = new Date(order.orderTime).getTime();
  const remainingSeconds = Math.floor((deadline - now.getTime()) / 1000);
  const totalSeconds = Math.max(1, Math.floor((deadline - created) / 1000));
  return {
    state: stateFromRemaining(remainingSeconds, totalSeconds),
    deadline: order.requestedDeliveryTime,
    remainingSeconds,
    label: formatCountdown(remainingSeconds),
  };
}

/** Fulfilment-stage SLA: RECEIVED -> READY within fulfilmentMinutes. */
export function getFulfilmentSla(order: Order, now: Date = new Date()): SlaInfo {
  const deadline = new Date(order.orderTime).getTime() + SLA_CONFIG.fulfilmentMinutes * 60_000;
  const remainingSeconds = Math.floor((deadline - now.getTime()) / 1000);
  const totalSeconds = SLA_CONFIG.fulfilmentMinutes * 60;
  return {
    state: order.readyAt ? "ON_TRACK" : stateFromRemaining(remainingSeconds, totalSeconds),
    deadline: new Date(deadline).toISOString(),
    remainingSeconds,
    label: formatCountdown(remainingSeconds),
  };
}

export function slaBadgeVariant(state: SlaState): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "ON_TRACK":
      return "secondary";
    case "AT_RISK":
      return "outline";
    case "BREACHED":
      return "destructive";
  }
}
