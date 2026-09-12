"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { SlaCountdown } from "@/components/shared/sla-countdown";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderDetailDrawer } from "@/components/orders/order-detail-drawer";
import { getOrders } from "@/lib/actions/orders";
import { useInterval } from "@/hooks/use-interval";
import { Search, PackageSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { Order, OrderStatus, Platform } from "@/types";

const STATUS_OPTIONS: OrderStatus[] = [
  "RECEIVED", "ACCEPTED", "PICKING", "READY", "DRIVER_ASSIGNED", "VEHICLE_ASSIGNED",
  "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED",
];

const PAGE_SIZE = 10;

export function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [platform, setPlatform] = useState<Platform | "ALL">("ALL");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useInterval(async () => {
    setOrders(await getOrders());
  }, 5000);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (platform !== "ALL" && o.source !== platform) return false;
      if (status !== "ALL" && o.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.externalOrderId.toLowerCase().includes(q) &&
          !o.customerName.toLowerCase().includes(q) &&
          !o.customerPhone.includes(q)
        )
          return false;
      }
      return true;
    });
  }, [orders, platform, status, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order ID, customer or phone…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={platform} onValueChange={(v) => { setPlatform(v as Platform | "ALL"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{(v: string | null) => (v === "UBER_EATS" ? "Uber Eats" : v === "DELIVEROO" ? "Deliveroo" : "All platforms")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All platforms</SelectItem>
            <SelectItem value="UBER_EATS">Uber Eats</SelectItem>
            <SelectItem value="DELIVEROO">Deliveroo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v as OrderStatus | "ALL"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>{(v: string | null) => (v && v !== "ALL" ? v.replace(/_/g, " ") : "All statuses")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {pageItems.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No orders match your filters" description="Try adjusting search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setSelectedId(o.id)}>
                    <TableCell className="font-medium">{o.externalOrderId}</TableCell>
                    <TableCell>{o.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(o.orderTime), "HH:mm")}</TableCell>
                    <TableCell>{o.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                    <TableCell>AED {o.orderValue.toFixed(2)}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell><SlaCountdown order={o} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {filtered.length} orders
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailDrawer
        orderId={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onChanged={async () => setOrders(await getOrders())}
      />
    </div>
  );
}
