"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DriverStatusBadge, OrderStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getDriverPortal, markCollectedAction, markDeliveredAction, markFailedAction } from "@/lib/actions/driver-portal";
import { useSession } from "@/lib/auth/session-store";
import { useInterval } from "@/hooks/use-interval";
import { PackageSearch, MapPin, Phone, Package, Navigation, XCircle } from "lucide-react";
import type { Order } from "@/types";
import type { getDriverPortal as GetDriverPortalType } from "@/lib/actions/driver-portal";

const DriverRouteMap = dynamic(() => import("@/components/drivers/driver-route-map").then((m) => m.DriverRouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

type Portal = Awaited<ReturnType<typeof GetDriverPortalType>>;
type PortalData = NonNullable<Portal>;

export function MyDeliveriesView() {
  const driverId = useSession((s) => s.driverId);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const refresh = useCallback(async () => {
    if (!driverId) return;
    const res = await getDriverPortal(driverId);
    setPortal(res);
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useInterval(refresh, 3000);

  if (!driverId) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No driver profile linked"
        description="Sign out and pick a driver from the login screen to see their deliveries."
      />
    );
  }

  if (loading || !portal) {
    return <p className="text-sm text-muted-foreground">Loading your deliveries…</p>;
  }

  const { driver, activeOrder, run, sla, history } = portal;

  async function handleCollected() {
    if (!activeOrder || !driverId) return;
    setActionPending(true);
    const res = await markCollectedAction(activeOrder.id, driverId, driver.fullName);
    setActionPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Order collected - heading to customer");
    refresh();
  }

  async function handleDelivered() {
    if (!activeOrder || !driverId) return;
    setActionPending(true);
    const res = await markDeliveredAction(activeOrder.id, driverId, driver.fullName);
    setActionPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Order delivered - nice work!");
    refresh();
  }

  async function handleFail() {
    if (!activeOrder || !driverId || !failReason.trim()) return;
    setActionPending(true);
    const res = await markFailedAction(activeOrder.id, driverId, driver.fullName, failReason.trim());
    setActionPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Delivery marked as failed");
    setFailDialogOpen(false);
    setFailReason("");
    refresh();
  }

  return (
    <div className="space-y-5">
      <Card className="p-4 flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={driver.avatarUrl} alt={driver.fullName} />
          <AvatarFallback>{driver.fullName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{driver.fullName}</p>
          <p className="text-sm text-muted-foreground">{driver.phone} · {driver.currentLocationLabel}</p>
        </div>
        <DriverStatusBadge status={driver.status} />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xl font-semibold">{driver.deliveryCount}</p>
          <p className="text-xs text-muted-foreground">Total Deliveries</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-semibold">{driver.successfulDeliveries}</p>
          <p className="text-xs text-muted-foreground">Successful</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-semibold">{driver.rating.toFixed(1)} ★</p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </Card>
      </div>

      {!activeOrder ? (
        <EmptyState icon={PackageSearch} title="No active delivery" description="You'll see your next assignment here as soon as it's dispatched." />
      ) : (
        <ActiveDeliveryCard
          order={activeOrder}
          run={run}
          driverPosition={{ lat: driver.currentLat, lng: driver.currentLng }}
          slaLabel={sla?.label}
          actionPending={actionPending}
          onCollect={handleCollected}
          onDeliver={handleDelivered}
          onFail={() => setFailDialogOpen(true)}
        />
      )}

      {history.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Recent History</p>
          <div className="space-y-2">
            {history.map((o) => (
              <Card key={o.id} className="p-3 flex items-center justify-between">
                <span className="text-sm">{o.externalOrderId} · {o.customerName}</span>
                <OrderStatusBadge status={o.status} />
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={failDialogOpen} onOpenChange={setFailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Can&apos;t complete this delivery?</DialogTitle>
            <DialogDescription>This will mark the order as failed and free you up for the next assignment.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="What happened? e.g. customer unreachable, wrong address…" value={failReason} onChange={(e) => setFailReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailDialogOpen(false)} disabled={actionPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleFail} disabled={actionPending || !failReason.trim()}>
              {actionPending ? "Submitting…" : "Confirm - mark failed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveDeliveryCard({
  order,
  run,
  driverPosition,
  slaLabel,
  actionPending,
  onCollect,
  onDeliver,
  onFail,
}: {
  order: Order;
  run: PortalData["run"];
  driverPosition: { lat: number; lng: number };
  slaLabel?: string;
  actionPending: boolean;
  onCollect: () => void;
  onDeliver: () => void;
  onFail: () => void;
}) {
  const heading = order.status === "DISPATCHED" ? "pickup" : "customer";
  const destination = heading === "pickup" ? { lat: order.pickupLat, lng: order.pickupLng } : { lat: order.deliveryLat, lng: order.deliveryLng };
  const destinationLabel = heading === "pickup" ? order.pickupName : order.customerName;
  const atDestination = run?.status === "AT_PICKUP" || run?.status === "ARRIVED_AT_CUSTOMER";

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b">
        <div>
          <p className="font-semibold text-sm">{order.externalOrderId}</p>
          <p className="text-xs text-muted-foreground">{order.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {slaLabel && <span className="text-xs font-medium text-muted-foreground">SLA {slaLabel}</span>}
        </div>
      </div>

      <div className="h-64">
        <DriverRouteMap
          driverPosition={driverPosition}
          destination={destination}
          destinationLabel={destinationLabel}
          routePoints={run?.routePoints ?? []}
        />
      </div>

      <div className="p-4 space-y-4">
        {atDestination ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> You&apos;ve arrived {heading === "pickup" ? `at ${order.pickupName}` : "at the customer"}
          </div>
        ) : (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800 flex items-center gap-2">
            <Navigation className="h-4 w-4" /> En route to {heading === "pickup" ? "pickup" : "customer"}
            {run && <span className="ml-auto text-xs">{Math.round((run.speedKmh ?? 0))} km/h</span>}
          </div>
        )}

        {heading === "pickup" ? (
          <InfoRow icon={Package} label={order.pickupName} />
        ) : (
          <>
            <InfoRow icon={MapPin} label={order.customerAddress} />
            <InfoRow icon={Phone} label={order.customerPhone} />
          </>
        )}

        <Separator />

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items</p>
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.quantity} × {item.productName}</span>
              </div>
            ))}
          </div>
        </div>

        {order.deliveryNotes && <p className="text-xs text-muted-foreground italic">&ldquo;{order.deliveryNotes}&rdquo;</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {heading === "pickup" && (
            <Button className="flex-1" disabled={!atDestination || actionPending} onClick={onCollect}>
              {atDestination ? "Mark Collected" : "Navigate to pickup"}
            </Button>
          )}
          {heading === "customer" && (
            <Button className="flex-1" disabled={!atDestination || actionPending} onClick={onDeliver}>
              {atDestination ? "Mark Delivered" : "En route to customer"}
            </Button>
          )}
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onFail} disabled={actionPending}>
            <XCircle className="h-4 w-4" /> Can&apos;t deliver
          </Button>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span>{label}</span>
    </div>
  );
}
