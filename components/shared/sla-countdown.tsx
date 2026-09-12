"use client";

import { useEffect, useState } from "react";
import { getOrderSla } from "@/lib/sla/sla-engine";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

const STATE_STYLES = {
  ON_TRACK: "text-emerald-600",
  AT_RISK: "text-amber-600",
  BREACHED: "text-red-600",
};

export function SlaCountdown({ order, className }: { order: Order; className?: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }

  const sla = getOrderSla(order);
  return (
    <span className={cn("text-xs font-medium tabular-nums", STATE_STYLES[sla.state], className)}>
      {sla.state === "BREACHED" ? "Breached" : sla.label}
    </span>
  );
}
