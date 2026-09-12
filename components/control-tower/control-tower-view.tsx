"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { getControlTowerSnapshot, type ControlTowerSnapshot, type DriverMarker } from "@/lib/actions/control-tower";
import { useInterval } from "@/hooks/use-interval";
import { formatDistanceToNow } from "date-fns";
import { Activity, Users, Truck, PackageCheck, AlertTriangle, Timer, CheckCircle2, Clock } from "lucide-react";

const ControlTowerMap = dynamic(() => import("@/components/control-tower/control-tower-map").then((m) => m.ControlTowerMap), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

const FILTERS = ["All", "Available", "On Delivery", "Delayed", "Offline"] as const;
type FilterKey = (typeof FILTERS)[number];

function matchesFilter(m: DriverMarker, filter: FilterKey): boolean {
  switch (filter) {
    case "All": return true;
    case "Available": return m.status === "AVAILABLE";
    case "On Delivery": return m.status === "BUSY";
    case "Delayed": return m.markerColor === "red";
    case "Offline": return m.status === "OFFLINE" || m.status === "INACTIVE";
  }
}

const MARKER_DOT: Record<DriverMarker["markerColor"], string> = {
  green: "bg-green-500",
  blue: "bg-blue-600",
  orange: "bg-amber-500",
  red: "bg-red-600",
  grey: "bg-gray-400",
};

export function ControlTowerView({ initialSnapshot }: { initialSnapshot: ControlTowerSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  useInterval(async () => {
    setSnapshot(await getControlTowerSnapshot());
  }, 3000);

  const filteredMarkers = useMemo(() => snapshot.markers.filter((m) => matchesFilter(m, filter)), [snapshot.markers, filter]);
  const selectedDriver = snapshot.markers.find((m) => m.id === selectedDriverId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard label="Active Orders" value={snapshot.kpis.activeOrders} icon={PackageCheck} />
        <KpiCard label="Drivers Available" value={snapshot.kpis.driversAvailable} icon={Users} tone="success" />
        <KpiCard label="On Delivery" value={snapshot.kpis.driversOnDelivery} icon={Truck} />
        <KpiCard label="Vehicles Available" value={snapshot.kpis.vehiclesAvailable} icon={Truck} />
        <KpiCard label="Orders At Risk" value={snapshot.kpis.ordersAtRisk} icon={AlertTriangle} tone={snapshot.kpis.ordersAtRisk > 0 ? "danger" : "default"} />
        <KpiCard label="Avg Delivery" value={`${snapshot.kpis.avgDeliveryMinutes}m`} icon={Timer} />
        <KpiCard label="On-Time %" value={`${snapshot.kpis.onTimePct}%`} icon={CheckCircle2} tone="success" />
        <KpiCard label="Waiting for Driver" value={snapshot.kpis.ordersWaitingForDriver} icon={Clock} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <Card className="p-2 h-[600px]">
          <ControlTowerMap markers={filteredMarkers} onSelect={setSelectedDriverId} />
        </Card>

        <div className="space-y-4">
          <PanelSection title="Orders At Risk" icon={AlertTriangle}>
            {snapshot.atRiskPanel.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders at risk right now.</p>
            ) : (
              snapshot.atRiskPanel.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium">{o.externalOrderId}</p>
                    <p className="text-xs text-muted-foreground">{o.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}</p>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">{o.reason}</Badge>
                </div>
              ))
            )}
          </PanelSection>

          <PanelSection title="Available Drivers" icon={Users}>
            {snapshot.availableDriversPanel.length === 0 ? (
              <p className="text-xs text-muted-foreground">No drivers available.</p>
            ) : (
              snapshot.availableDriversPanel.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span>{d.fullName}</span>
                  <span className="text-xs text-muted-foreground">{d.locationLabel}</span>
                </div>
              ))
            )}
          </PanelSection>

          <PanelSection title="Active Deliveries" icon={Activity}>
            {snapshot.activeDeliveriesPanel.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active deliveries.</p>
            ) : (
              snapshot.activeDeliveriesPanel.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium">{o.externalOrderId}</p>
                    <p className="text-xs text-muted-foreground">{o.customerName}{o.legLabel ? ` · ${o.legLabel}` : ""}</p>
                  </div>
                  <span className="text-xs font-medium">ETA {o.etaMinutes}m</span>
                </div>
              ))
            )}
          </PanelSection>
        </div>
      </div>

      <Sheet open={!!selectedDriverId} onOpenChange={(open) => !open && setSelectedDriverId(null)}>
        <SheetContent>
          {!selectedDriver ? (
            <EmptyState title="Driver went offline" />
          ) : (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedDriver.avatarUrl} alt={selectedDriver.fullName} />
                    <AvatarFallback>{selectedDriver.fullName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{selectedDriver.fullName}</SheetTitle>
                    <SheetDescription className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${MARKER_DOT[selectedDriver.markerColor]}`} />
                      {selectedDriver.status.replace("_", " ")}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-3 text-sm">
                <Row label="Vehicle" value={selectedDriver.vehicleLabel ?? "Unassigned"} />
                <Row label="Current Order" value={selectedDriver.currentOrderExternalId ?? "None"} />
                {selectedDriver.legLabel && <Row label="Stage" value={selectedDriver.legLabel} />}
                <Row label="Speed" value={`${selectedDriver.speedKmh} km/h`} />
                <Row label="ETA" value={selectedDriver.etaMinutes ? `${selectedDriver.etaMinutes} min` : "-"} />
                <Row label="Last Update" value={formatDistanceToNow(new Date(selectedDriver.lastGpsUpdate), { addSuffix: true })} />
                <Row label="Today's Deliveries" value={String(selectedDriver.todayDeliveries)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PanelSection({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
        <Icon className="h-4 w-4" /> {title}
      </p>
      <div>{children}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
