"use client";

import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { DonutWithLegend, type DonutSlice } from "@/components/dashboard/donut-with-legend";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Package, Clock, CheckCircle2, Truck, PackageCheck, XCircle, AlertTriangle, TrendingUp, Timer, Percent } from "lucide-react";
import type { getDashboardData } from "@/lib/actions/dashboard";
import type { OrderStatus } from "@/types";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED: "#0891b2",
  ACCEPTED: "#16a34a",
  PICKING: "#f59e0b",
  READY: "#2563eb",
  DRIVER_ASSIGNED: "#0d9488",
  VEHICLE_ASSIGNED: "#0ea5e9",
  DISPATCHED: "#7c3aed",
  OUT_FOR_DELIVERY: "#db2777",
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626",
  FAILED: "#991b1b",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  PICKING: "Picking",
  READY: "Ready",
  DRIVER_ASSIGNED: "Driver Assigned",
  VEHICLE_ASSIGNED: "Vehicle Assigned",
  DISPATCHED: "Dispatched",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

const DRIVER_UTIL_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#94a3b8"];
const VEHICLE_UTIL_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#94a3b8"];

export function DashboardView({ data }: { data: DashboardData }) {
  const totalOrders = data.statusBreakdown.reduce((s, d) => s + d.count, 0);
  const statusSlices: DonutSlice[] = data.statusBreakdown.map((d) => ({
    name: STATUS_LABELS[d.status],
    value: d.count,
    color: STATUS_COLORS[d.status],
  }));
  const driverSlices: DonutSlice[] = data.driverUtilisation.map((d, i) => ({ ...d, color: DRIVER_UTIL_COLORS[i] }));
  const vehicleSlices: DonutSlice[] = data.vehicleUtilisation.map((d, i) => ({ ...d, color: VEHICLE_UTIL_COLORS[i] }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Today's Orders" value={data.cards.todaysOrders.value} icon={Package} iconColor="blue" deltaPct={data.cards.todaysOrders.deltaPct} deltaGood />
        <KpiCard label="Pending Fulfilment" value={data.cards.pendingFulfilment.value} icon={Clock} iconColor="amber" deltaPct={data.cards.pendingFulfilment.deltaPct} deltaGood={false} />
        <KpiCard label="Ready Orders" value={data.cards.readyOrders.value} icon={PackageCheck} iconColor="green" deltaPct={data.cards.readyOrders.deltaPct} deltaGood />
        <KpiCard label="Active Deliveries" value={data.cards.activeDeliveries.value} icon={Truck} iconColor="violet" deltaPct={data.cards.activeDeliveries.deltaPct} deltaGood />
        <KpiCard label="Delivered" value={data.cards.delivered.value} icon={CheckCircle2} iconColor="green" tone="success" deltaPct={data.cards.delivered.deltaPct} deltaGood />
        <KpiCard label="Cancelled" value={data.cards.cancelled.value} icon={XCircle} iconColor="red" tone="danger" deltaPct={data.cards.cancelled.deltaPct} deltaGood={false} />
        <KpiCard
          label="Orders At Risk"
          value={data.cards.ordersAtRisk.value}
          icon={AlertTriangle}
          iconColor="amber"
          tone={data.cards.ordersAtRisk.value > 0 ? "warning" : "default"}
          deltaPct={data.cards.ordersAtRisk.deltaPct}
          deltaGood={false}
        />
        <KpiCard label="On-Time Delivery" value={`${data.cards.onTimePct.value}%`} icon={TrendingUp} iconColor="cyan" tone="success" hint="Today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Orders by Platform</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.ordersByPlatform}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="uberEats" name="Uber Eats" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="deliveroo" name="Deliveroo" stackId="a" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Order Status</p>
          <DonutWithLegend data={statusSlices} centerLabel="Total Orders" centerValue={totalOrders} />
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Deliveries Over Time</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.deliveriesOverTime}>
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="scheduledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#16a34a" fill="url(#completedGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="scheduled" name="Scheduled" stroke="#60a5fa" fill="url(#scheduledGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Driver Utilisation</p>
          <DonutWithLegend data={driverSlices} centerLabel="Active" centerValue={`${data.driverActivePct}%`} />
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Vehicle Utilisation</p>
          <DonutWithLegend data={vehicleSlices} centerLabel="In Use" centerValue={`${data.vehicleInUsePct}%`} />
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Delivery Performance</p>
          <div className="grid grid-cols-1 gap-3 h-[172px] content-center">
            <PerfStat icon={Timer} label="Avg. Delivery Time" value={`${data.deliveryPerformance.avgDeliveryMinutes} min`} />
            <PerfStat icon={CheckCircle2} label="On-Time Delivery" value={`${data.deliveryPerformance.onTimePct}%`} />
            <PerfStat icon={Percent} label="Cancellation Rate" value={`${data.deliveryPerformance.cancellationRate}%`} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <RecentOrdersTable orders={data.recentOrders} />
        <LiveActivityFeed entries={data.liveActivity} />
      </div>
    </div>
  );
}

function PerfStat({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <span className="text-base font-semibold">{value}</span>
    </div>
  );
}
