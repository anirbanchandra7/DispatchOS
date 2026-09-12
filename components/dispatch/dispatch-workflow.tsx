"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { EmptyState } from "@/components/shared/empty-state";
import { AllocationPanel } from "@/components/dispatch/allocation-panel";
import { getOrders } from "@/lib/actions/orders";
import { useInterval } from "@/hooks/use-interval";
import { Route } from "lucide-react";
import type { Order } from "@/types";

const DISPATCH_STATUSES: Order["status"][] = ["READY", "DRIVER_ASSIGNED", "VEHICLE_ASSIGNED"];

const STEP_LABELS: Record<Order["status"], string> = {
  RECEIVED: "",
  ACCEPTED: "",
  PICKING: "",
  READY: "Step 1 · Assign driver",
  DRIVER_ASSIGNED: "Step 2 · Assign vehicle",
  VEHICLE_ASSIGNED: "Step 3 · Confirm dispatch",
  DISPATCHED: "",
  OUT_FOR_DELIVERY: "",
  DELIVERED: "",
  CANCELLED: "",
  FAILED: "",
};

export function DispatchWorkflow({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders.find((o) => DISPATCH_STATUSES.includes(o.status))?.id ?? null,
  );

  const refresh = async () => setOrders(await getOrders());
  useInterval(refresh, 5000);

  const queue = useMemo(
    () => orders.filter((o) => DISPATCH_STATUSES.includes(o.status)).sort((a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime()),
    [orders],
  );

  useEffect(() => {
    if (selectedId && !queue.find((o) => o.id === selectedId)) {
      setSelectedId(queue[0]?.id ?? null);
    }
    if (!selectedId && queue[0]) setSelectedId(queue[0].id);
  }, [queue, selectedId]);

  const selected = queue.find((o) => o.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ready for dispatch ({queue.length})</p>
        {queue.length === 0 ? (
          <EmptyState icon={Route} title="Nothing to dispatch" description="Orders will appear here once marked Ready." />
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {queue.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-colors",
                  selectedId === o.id ? "border-primary bg-accent" : "hover:bg-muted/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{o.externalOrderId}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{o.customerName}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted-foreground">{o.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}</span>
                  <SlaCountdown order={o} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {!selected ? (
          <Card className="p-10">
            <EmptyState icon={Route} title="Select an order" description="Choose an order from the list to begin the dispatch workflow." />
          </Card>
        ) : (
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{selected.externalOrderId} · {selected.customerName}</p>
                <p className="text-xs text-primary font-medium mt-0.5">{STEP_LABELS[selected.status]}</p>
              </div>
              <OrderStatusBadge status={selected.status} />
            </div>
            <AllocationPanel order={selected} onChanged={refresh} />
          </Card>
        )}
      </div>
    </div>
  );
}
