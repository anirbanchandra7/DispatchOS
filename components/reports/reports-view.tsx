"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/shared/kpi-card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getReportsData, type ReportRange } from "@/lib/actions/reports";
import { DollarSign, Package, Timer, TrendingUp, Percent, Users, Truck } from "lucide-react";

const RANGE_OPTIONS: { key: ReportRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const COLORS = ["#16a34a", "#2563eb"];

export function ReportsView({ initialData, initialRange }: { initialData: Awaited<ReturnType<typeof getReportsData>>; initialRange: ReportRange }) {
  const [range, setRange] = useState<ReportRange>(initialRange);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    getReportsData({ range }).then(setData);
  }, [range]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              range === r.key ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Order Volume" value={data.orderVolume} icon={Package} />
        <KpiCard label="Revenue (AED)" value={data.revenue.toFixed(2)} icon={DollarSign} />
        <KpiCard label="Avg Delivery Time" value={`${data.avgDeliveryMinutes}m`} icon={Timer} />
        <KpiCard label="On-Time Delivery" value={`${data.onTimePct}%`} icon={TrendingUp} tone="success" />
        <KpiCard label="Cancellation Rate" value={`${data.cancellationRate}%`} icon={Percent} tone={data.cancellationRate > 10 ? "danger" : "default"} />
        <KpiCard label="Avg Fulfilment Time" value={`${data.avgFulfilmentMinutes}m`} icon={Timer} />
        <KpiCard label="Avg Dispatch Time" value={`${data.avgDispatchMinutes}m`} icon={Timer} />
        <KpiCard label="Driver Utilisation" value={`${data.driverUtilisationPct}%`} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-2">Platform Split</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.platformSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.platformSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users className="h-4 w-4" /> Orders per Driver</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.ordersPerDriver.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Truck className="h-4 w-4" /> Orders per Vehicle</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.ordersPerVehicle.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
