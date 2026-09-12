"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge, FulfilmentStatusBadge } from "@/components/shared/status-badge";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { AllocationPanel } from "@/components/dispatch/allocation-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  getOrderById,
  acceptOrderAction,
  rejectOrderAction,
  startFulfilmentAction,
  markReadyAction,
  forceCollectAction,
  forceDeliverAction,
} from "@/lib/actions/orders";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import { format } from "date-fns";
import { MapPin, Phone, User, Navigation, PackageCheck } from "lucide-react";
import type { AuditEntry, CompanyVehicle, DeliveryRun, Driver, DriverOwnedVehicle, Order, OrderStatusHistoryEntry } from "@/types";

interface OrderDetail {
  order: Order;
  driver?: Driver;
  vehicle?: CompanyVehicle | DriverOwnedVehicle;
  history: OrderStatusHistoryEntry[];
  audit: AuditEntry[];
  run: DeliveryRun | null;
}

const RUN_STAGE_LABEL: Record<DeliveryRun["status"], string> = {
  EN_ROUTE_PICKUP: "En route to pickup",
  AT_PICKUP: "Arrived at pickup — waiting for driver to collect",
  EN_ROUTE_CUSTOMER: "En route to customer",
  ARRIVED_AT_CUSTOMER: "Arrived at customer — waiting for driver to confirm delivery",
  DELIVERED: "Completed",
};

export function OrderDetailDrawer({
  orderId,
  onOpenChange,
  onChanged,
}: {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [forceCollectOpen, setForceCollectOpen] = useState(false);
  const [forceDeliverOpen, setForceDeliverOpen] = useState(false);
  const cancelReason = "Customer requested cancellation";
  const role = useSession((s) => s.role);
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  const refresh = useCallback(async () => {
    if (!orderId) return;
    const res = await getOrderById(orderId);
    setDetail(res as OrderDetail | null);
  }, [orderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAction(fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    const res = await fn();
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(successMsg);
    await refresh();
    await onChanged();
  }

  return (
    <Sheet open={!!orderId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {!detail ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {detail.order.externalOrderId}
                <OrderStatusBadge status={detail.order.status} />
              </SheetTitle>
              <SheetDescription>
                {detail.order.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"} · Placed {format(new Date(detail.order.orderTime), "MMM d, HH:mm")}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6 space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground">Delivery SLA</p>
                  <SlaCountdown order={detail.order} className="text-base" />
                </div>
                <FulfilmentStatusBadge status={detail.order.fulfilmentStatus} />
              </div>

              <div className="flex flex-wrap gap-2">
                {detail.order.status === "RECEIVED" && (
                  <>
                    <Button size="sm" onClick={() => handleAction(() => acceptOrderAction(detail.order.id, actor), "Order accepted")}>
                      Accept Order
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
                      Reject
                    </Button>
                  </>
                )}
                {detail.order.status === "ACCEPTED" && (
                  <Button size="sm" onClick={() => handleAction(() => startFulfilmentAction(detail.order.id, actor), "Picking started")}>
                    Start Fulfilment
                  </Button>
                )}
                {(detail.order.status === "ACCEPTED" || detail.order.status === "PICKING") && (
                  <Button size="sm" variant="outline" onClick={() => handleAction(() => markReadyAction(detail.order.id, actor), "Order marked ready")}>
                    Mark Ready
                  </Button>
                )}
                {!["DELIVERED", "CANCELLED", "FAILED", "RECEIVED"].includes(detail.order.status) && (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
                    Cancel Order
                  </Button>
                )}
              </div>

              <AllocationPanel order={detail.order} onChanged={async () => { await refresh(); await onChanged(); }} />

              {(detail.order.status === "DISPATCHED" || detail.order.status === "OUT_FOR_DELIVERY") && (
                <div className="rounded-lg border p-3 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    {detail.run ? RUN_STAGE_LABEL[detail.run.status] : "Waiting for GPS update…"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Driver taps Collected/Delivered from their own screen. Use the override below only if a delivery is stuck.
                  </p>
                  <div className="flex gap-2">
                    {detail.order.status === "DISPATCHED" && (
                      <Button size="sm" variant="outline" onClick={() => setForceCollectOpen(true)}>
                        <PackageCheck className="h-3.5 w-3.5" /> Force Collect
                      </Button>
                    )}
                    {detail.order.status === "OUT_FOR_DELIVERY" && (
                      <Button size="sm" variant="outline" onClick={() => setForceDeliverOpen(true)}>
                        <PackageCheck className="h-3.5 w-3.5" /> Force Deliver
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="items" className="flex-1">Items</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-3 text-sm mt-3">
                  <InfoRow icon={User} label={detail.order.customerName} />
                  <InfoRow icon={Phone} label={detail.order.customerPhone} />
                  <InfoRow icon={MapPin} label={detail.order.customerAddress} />
                  {detail.order.deliveryNotes && (
                    <p className="text-xs text-muted-foreground italic">&ldquo;{detail.order.deliveryNotes}&rdquo;</p>
                  )}
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Field label="Pickup" value={detail.order.pickupName} />
                    <Field label="Payment" value={detail.order.paymentMethod} />
                    <Field label="Driver" value={detail.driver?.fullName ?? "Unassigned"} />
                    <Field
                      label="Vehicle"
                      value={detail.vehicle ? `${detail.vehicle.make} ${detail.vehicle.model} (${detail.vehicle.registrationNumber})` : "Unassigned"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="items" className="mt-3 space-y-2">
                  {detail.order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
                      <span>{item.quantity} × {item.productName}</span>
                      <span className="text-muted-foreground">AED {(item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-medium pt-2">
                    <span>Total</span>
                    <span>AED {detail.order.orderValue.toFixed(2)}</span>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-3 space-y-3">
                  {detail.audit.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                  ) : (
                    detail.audit
                      .slice()
                      .reverse()
                      .map((a) => (
                        <div key={a.id} className="text-sm flex gap-3">
                          <span className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">{format(new Date(a.timestamp), "HH:mm")}</span>
                          <div>
                            <p>{a.action}</p>
                            <p className="text-xs text-muted-foreground">by {a.actor}</p>
                          </div>
                        </div>
                      ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>

      {detail && (
        <>
          <ConfirmDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            title="Cancel this order?"
            description="This will release any reserved inventory and free up the assigned driver and vehicle."
            confirmLabel="Cancel Order"
            destructive
            onConfirm={() => handleAction(() => rejectOrderAction(detail.order.id, actor, cancelReason), "Order cancelled")}
          />
          <ConfirmDialog
            open={forceCollectOpen}
            onOpenChange={setForceCollectOpen}
            title="Force-collect this order?"
            description="Marks the order collected on the driver's behalf, deducts stock, and starts the leg to the customer. Only use this for a stuck delivery."
            confirmLabel="Force Collect"
            onConfirm={() => handleAction(() => forceCollectAction(detail.order.id, actor), "Order force-collected")}
          />
          <ConfirmDialog
            open={forceDeliverOpen}
            onOpenChange={setForceDeliverOpen}
            title="Force-deliver this order?"
            description="Closes the order as delivered on the driver's behalf and frees up their vehicle. Only use this for a stuck delivery."
            confirmLabel="Force Deliver"
            onConfirm={() => handleAction(() => forceDeliverAction(detail.order.id, actor), "Order force-delivered")}
          />
        </>
      )}
    </Sheet>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
