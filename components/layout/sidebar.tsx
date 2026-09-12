"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Truck,
  Radar,
  Users,
  Car,
  Boxes,
  BarChart3,
  Settings,
  LogOut,
  Route,
  Zap,
} from "lucide-react";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_NAV, NAV_ROUTES, type NavKey } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: Package,
  fulfilment: ClipboardCheck,
  dispatch: Route,
  "control-tower": Radar,
  drivers: Users,
  vehicles: Car,
  inventory: Boxes,
  reports: BarChart3,
  settings: Settings,
  "my-deliveries": Truck,
};

const NAV_LABELS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  orders: "Orders",
  fulfilment: "Fulfilment",
  dispatch: "Dispatch",
  "control-tower": "Control Tower",
  drivers: "Drivers",
  vehicles: "Vehicles",
  inventory: "Inventory",
  reports: "Reports",
  settings: "Settings",
  "my-deliveries": "My Deliveries",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, fullName, logout } = useSession();

  if (!role) return null;
  const navKeys = ROLE_NAV[role];

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0 border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground shrink-0">
          <Zap className="h-4.5 w-4.5 fill-current" />
        </div>
        <div className="min-w-0">
          <p className="font-bold tracking-tight text-[16px] text-foreground leading-tight truncate">DispatchOS</p>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">Last Mile Delivery</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navKeys.map((key) => {
          const Icon = NAV_ICONS[key];
          const href = NAV_ROUTES[key];
          const active = pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {NAV_LABELS[key]}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
              {fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
