"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlobalSearch } from "@/components/layout/global-search";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_NAV, NAV_ROUTES, type NavKey } from "@/lib/auth/permissions";
import Link from "next/link";
import { getNotificationsAction, markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { ingestPlatformOrders } from "@/lib/actions/platform";
import { useInterval } from "@/hooks/use-interval";
import { formatDistanceToNow } from "date-fns";
import type { AppNotification } from "@/types";

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

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Topbar() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const now = useLiveClock();

  const refresh = useCallback(async () => {
    const res = await getNotificationsAction();
    setNotifications(res.notifications);
    setUnread(res.unread);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Simulate inbound platform orders arriving in the background.
  useInterval(async () => {
    await ingestPlatformOrders();
    refresh();
  }, 8000);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 md:px-6">
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1 max-w-md hidden sm:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Popover onOpenChange={(open) => open && markAllNotificationsReadAction().then(refresh)}>
          <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-white text-[10px] leading-4 text-center px-0.5">
                  {unread}
                </span>
              )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 border-b font-medium text-sm">Notifications</div>
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-6 text-center">No notifications yet</p>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-4 py-3">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {now && (
          <div className="hidden lg:block text-right leading-tight">
            <p className="text-xs font-medium">
              {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className="text-[11px] text-muted-foreground">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          System Online
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { role } = useSession();
  if (!role) return null;
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      <div className="px-2 h-14 flex items-center font-semibold">DispatchOS</div>
      {ROLE_NAV[role].map((key) => (
        <Link
          key={key}
          href={NAV_ROUTES[key]}
          className={`rounded-md px-3 py-2 text-sm ${pathname.startsWith(NAV_ROUTES[key]) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}
        >
          {NAV_LABELS[key]}
        </Link>
      ))}
    </nav>
  );
}
