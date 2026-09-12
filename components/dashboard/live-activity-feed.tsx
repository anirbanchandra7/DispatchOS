import Link from "next/link";
import {
  Package,
  UserCheck,
  Car,
  Send,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity as ActivityIcon,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/types";

function iconFor(action: string): { Icon: typeof Package; color: string } {
  const a = action.toLowerCase();
  if (a.includes("received")) return { Icon: Package, color: "bg-blue-50 text-blue-600" };
  if (a.includes("driver") && a.includes("assign")) return { Icon: UserCheck, color: "bg-blue-50 text-blue-600" };
  if (a.includes("vehicle")) return { Icon: Car, color: "bg-cyan-50 text-cyan-600" };
  if (a.includes("dispatch")) return { Icon: Send, color: "bg-violet-50 text-violet-600" };
  if (a.includes("collect")) return { Icon: PackageCheck, color: "bg-indigo-50 text-indigo-600" };
  if (a.includes("delivered")) return { Icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" };
  if (a.includes("risk") || a.includes("breach") || a.includes("late")) return { Icon: AlertTriangle, color: "bg-red-50 text-red-600" };
  if (a.includes("cancel") || a.includes("fail")) return { Icon: XCircle, color: "bg-red-50 text-red-600" };
  return { Icon: ActivityIcon, color: "bg-slate-100 text-slate-600" };
}

export function LiveActivityFeed({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Live Activity</p>
        <Link href="/reports" className="text-xs font-medium text-primary flex items-center gap-0.5 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const { Icon, color } = iconFor(e.action);
            return (
              <div key={e.id} className="flex items-start gap-3">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-tight">{e.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.details ? `${e.details} · ` : ""}{e.actor}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">{format(new Date(e.timestamp), "HH:mm")}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
