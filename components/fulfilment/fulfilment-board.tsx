"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderDetailDrawer } from "@/components/orders/order-detail-drawer";
import { getFulfilmentBoard, type FulfilmentCard } from "@/lib/actions/fulfilment";
import { acceptOrderAction, startFulfilmentAction, markReadyAction, rejectOrderAction } from "@/lib/actions/orders";
import { getOrderSla } from "@/lib/sla/sla-engine";
import { useInterval } from "@/hooks/use-interval";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import { ClipboardCheck, Clock, MapPin, Sparkles, Search, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { OrderStatus, Platform } from "@/types";

type SortMode = "time" | "sla";

const STAGE_OPTIONS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All stages" },
  { value: "RECEIVED", label: "Received" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PICKING", label: "Picking" },
  { value: "READY", label: "Ready" },
  { value: "DRIVER_ASSIGNED", label: "Driver Assigned" },
  { value: "VEHICLE_ASSIGNED", label: "Vehicle Assigned" },
];

const SLA_RANK: Record<string, number> = { BREACHED: 0, AT_RISK: 1, ON_TRACK: 2 };

export function FulfilmentBoard({ initialCards }: { initialCards: FulfilmentCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<Platform | "ALL">("ALL");
  const [stage, setStage] = useState<OrderStatus | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("time");
  const role = useSession((s) => s.role);
  const actor = role ? ROLE_DEMO_NAME[role] : "Fulfilment Operator";

  const refresh = async () => setCards(await getFulfilmentBoard());
  useInterval(refresh, 5000);

  const filtered = useMemo(() => {
    let list = cards.filter(({ order: o }) => {
      if (platform !== "ALL" && o.source !== platform) return false;
      if (stage !== "ALL" && o.status !== stage) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.externalOrderId.toLowerCase().includes(q) && !o.customerName.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "sla") {
        const slaA = getOrderSla(a.order);
        const slaB = getOrderSla(b.order);
        const rankDiff = SLA_RANK[slaA.state] - SLA_RANK[slaB.state];
        if (rankDiff !== 0) return rankDiff;
        return slaA.remainingSeconds - slaB.remainingSeconds;
      }
      return new Date(a.order.orderTime).getTime() - new Date(b.order.orderTime).getTime();
    });
    return list;
  }, [cards, search, platform, stage, sort]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    const res = await fn();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(msg);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order ID or customer…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={platform} onValueChange={(v) => setPlatform((v as Platform | "ALL") ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{(v: string | null) => (v === "UBER_EATS" ? "Uber Eats" : v === "DELIVEROO" ? "Deliveroo" : "All platforms")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All platforms</SelectItem>
            <SelectItem value="UBER_EATS">Uber Eats</SelectItem>
            <SelectItem value="DELIVEROO">Deliveroo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={(v) => setStage((v as OrderStatus | "ALL") ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>{(v: string | null) => STAGE_OPTIONS.find((s) => s.value === v)?.label ?? "All stages"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort((v as SortMode) ?? "time")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>{(v: string | null) => (v === "sla" ? "Sort: SLA urgency" : "Sort: Time received")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Sort: Time received</SelectItem>
            <SelectItem value="sla">Sort: SLA urgency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No pending orders" description="Everything is fulfilled - new orders will appear here automatically." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ order: o, shortages }) => {
            const sla = getOrderSla(o);
            const isNew = Date.now() - new Date(o.orderTime).getTime() < 3 * 60_000;
            const waitingTooLong = o.status === "RECEIVED" && Date.now() - new Date(o.orderTime).getTime() > 6 * 60_000;
            const hasShortage = shortages.length > 0;

            return (
              <Card key={o.id} className="p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(o.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{o.externalOrderId}</p>
                    <p className="text-xs text-muted-foreground">{o.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"} · {o.customerName}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {isNew && <Badge className="bg-blue-600 text-white text-[10px]"><Sparkles className="h-3 w-3 mr-1" />New</Badge>}
                  {o.autoAccepted && <Badge className="bg-indigo-600 text-white text-[10px]"><Zap className="h-3 w-3 mr-1" />Auto-accepted</Badge>}
                  {waitingTooLong && <Badge variant="destructive" className="text-[10px]"><Clock className="h-3 w-3 mr-1" />Waiting too long</Badge>}
                  {sla.state === "AT_RISK" && <Badge className="bg-amber-500 text-white text-[10px]">SLA Risk</Badge>}
                  {sla.state === "BREACHED" && <Badge variant="destructive" className="text-[10px]">SLA Breached</Badge>}
                  {o.status === "READY" && <Badge className="bg-emerald-600 text-white text-[10px]">Ready for dispatch</Badge>}
                  {o.driverId && <Badge variant="secondary" className="text-[10px]">Driver assigned</Badge>}
                </div>

                {o.status === "RECEIVED" && (
                  hasShortage ? (
                    <div className="rounded-md bg-red-50 border border-red-200 px-2.5 py-2 text-xs text-red-800">
                      <p className="font-medium flex items-center gap-1 mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Stock shortage</p>
                      {shortages.map((s) => (
                        <p key={s.sku} className="text-[11px]">{s.productName}: need {s.requested}, have {s.available}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Stock OK
                    </div>
                  )
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{o.customerAddress}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{o.items.reduce((s, i) => s + i.quantity, 0)} items · AED {o.orderValue.toFixed(2)}</span>
                  <SlaCountdown order={o} />
                </div>

                <div className="text-[11px] text-muted-foreground">Ordered {formatDistanceToNowStrict(new Date(o.orderTime), { addSuffix: true })}</div>

                {o.driverId && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">DR</AvatarFallback></Avatar>
                    <span className="text-xs">Driver assigned</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {o.status === "RECEIVED" && !hasShortage && (
                    <>
                      <Button size="sm" onClick={() => run(() => acceptOrderAction(o.id, actor), "Order accepted")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => run(() => rejectOrderAction(o.id, actor, "Rejected by fulfilment"), "Order rejected")}>Reject</Button>
                    </>
                  )}
                  {o.status === "RECEIVED" && hasShortage && (
                    <>
                      <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => run(() => acceptOrderAction(o.id, actor, true), "Accepted despite shortage")}>
                        Accept Anyway
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => run(() => rejectOrderAction(o.id, actor, "Stock unavailable"), "Order rejected")}>Reject</Button>
                    </>
                  )}
                  {o.status === "ACCEPTED" && (
                    <>
                      <Button size="sm" onClick={() => run(() => startFulfilmentAction(o.id, actor), "Picking started")}>Start Fulfilment</Button>
                      <Button size="sm" variant="outline" onClick={() => run(() => markReadyAction(o.id, actor), "Marked ready")}>Mark Ready</Button>
                    </>
                  )}
                  {o.status === "PICKING" && (
                    <Button size="sm" onClick={() => run(() => markReadyAction(o.id, actor), "Marked ready")}>Mark Ready</Button>
                  )}
                  {["READY", "DRIVER_ASSIGNED", "VEHICLE_ASSIGNED"].includes(o.status) && (
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(o.id)}>
                      {o.status === "READY" ? "Assign Driver" : o.status === "DRIVER_ASSIGNED" ? "Assign Vehicle" : "Review & Dispatch"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <OrderDetailDrawer orderId={selectedId} onOpenChange={(open) => !open && setSelectedId(null)} onChanged={refresh} />
    </div>
  );
}
