"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function DonutWithLegend({
  data,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  centerLabel: string;
  centerValue: number | string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold">{centerValue}</span>
          <span className="text-[10px] text-muted-foreground text-center leading-tight px-2">{centerLabel}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground truncate">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="font-medium shrink-0">
              {d.value} {total > 0 && <span className="text-muted-foreground font-normal">({Math.round((d.value / total) * 100)}%)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
