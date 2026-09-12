"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DriverPicker } from "@/components/dispatch/driver-picker";
import { VehiclePicker } from "@/components/dispatch/vehicle-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getAllocationOptions, assignDriverAction, assignVehicleAction, dispatchOrderAction } from "@/lib/actions/orders";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import type { DriverOption, Order, VehicleOption } from "@/types";

interface AllocationOptions {
  drivers: DriverOption[];
  vehicles: VehicleOption[];
  recommendedDriver?: DriverOption;
  recommendedVehicle?: VehicleOption;
  etaMinutes: number;
}

export function AllocationPanel({ order, onChanged }: { order: Order; onChanged: () => void | Promise<void> }) {
  const [options, setOptions] = useState<AllocationOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const role = useSession((s) => s.role);
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  useEffect(() => {
    getAllocationOptions(order.id).then((res) => setOptions(res as AllocationOptions));
  }, [order.id, order.status]);

  async function handleAssignDriver(d: DriverOption) {
    setLoading(true);
    const res = await assignDriverAction(order.id, d.id, actor);
    setLoading(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`${d.fullName} assigned as driver`);
    await onChanged();
  }

  async function handleAssignVehicle(v: VehicleOption) {
    setLoading(true);
    const res = await assignVehicleAction(order.id, v.id, v.ownership, actor);
    setLoading(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`${v.make} ${v.model} assigned`);
    await onChanged();
  }

  async function handleDispatch() {
    setLoading(true);
    const res = await dispatchOrderAction(order.id, actor);
    setLoading(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Order dispatched — now out for delivery");
    await onChanged();
  }

  if (!["READY", "DRIVER_ASSIGNED", "VEHICLE_ASSIGNED"].includes(order.status)) return null;
  if (!options) return <p className="text-sm text-muted-foreground">Loading allocation options…</p>;

  return (
    <div className="space-y-4">
      {order.status === "READY" && (
        <div>
          <p className="text-sm font-medium mb-2">Assign a driver</p>
          <DriverPicker options={options.drivers} onSelect={handleAssignDriver} />
        </div>
      )}

      {order.status === "DRIVER_ASSIGNED" && (
        <div>
          <p className="text-sm font-medium mb-2">Assign a vehicle</p>
          <VehiclePicker options={options.vehicles} onSelect={handleAssignVehicle} />
        </div>
      )}

      {order.status === "VEHICLE_ASSIGNED" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Confirm dispatch</p>
          <div className="rounded-lg border p-4 space-y-3 text-sm bg-muted/30">
            <SummaryRow label="Order" value={`${order.externalOrderId} · ${order.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}`} />
            <SummaryRow label="Customer" value={order.customerName} />
            <Separator />
            <SummaryRow label="ETA" value={`${options.etaMinutes} minutes`} />
          </div>
          <Button className="w-full" disabled={loading} onClick={() => setConfirmOpen(true)}>
            Dispatch Order
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Dispatch this order?"
        description={`Order ${order.externalOrderId} will move to Out for Delivery. Driver and vehicle status will update automatically.`}
        confirmLabel="Dispatch"
        onConfirm={handleDispatch}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
