import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  violet: "bg-violet-50 text-violet-600",
  cyan: "bg-cyan-50 text-cyan-600",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  deltaPct,
  deltaGood = true,
  deltaLabel = "vs previous period",
  iconColor = "slate",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
  hint?: string;
  /** Percentage change to show as a trend line, e.g. 12 or -8. */
  deltaPct?: number;
  /** Whether an increase in this metric is desirable (colours the delta green/red accordingly). */
  deltaGood?: boolean;
  deltaLabel?: string;
  iconColor?: "slate" | "blue" | "green" | "amber" | "red" | "violet" | "cyan";
}) {
  const toneStyles: Record<string, string> = {
    default: "text-foreground",
    warning: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  };

  const isPositive = (deltaPct ?? 0) >= 0;
  const isDesirable = isPositive === deltaGood;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
        {Icon && (
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", ICON_COLORS[iconColor])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <span className={cn("text-2xl font-semibold tabular-nums", toneStyles[tone])}>{value}</span>
      {deltaPct !== undefined ? (
        <div className="flex items-center gap-1 text-xs">
          <span className={cn("flex items-center gap-0.5 font-medium", isDesirable ? "text-emerald-600" : "text-red-600")}>
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(deltaPct)}%
          </span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </div>
      ) : (
        hint && <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}
