"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DriverStatusBadge } from "@/components/shared/status-badge";
import { useSession } from "@/lib/auth/session-store";
import { ALL_ROLES, ROLE_DEMO_NAME, ROLE_LABELS } from "@/lib/auth/roles";
import { defaultRouteForRole } from "@/lib/auth/permissions";
import { getDrivers } from "@/lib/actions/drivers";
import { Shield, Radar, ClipboardCheck, Route, Truck, ArrowLeft } from "lucide-react";
import type { Driver, UserRole } from "@/types";

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  ADMIN: Shield,
  OPERATIONS_MANAGER: Radar,
  FULFILMENT_OPERATOR: ClipboardCheck,
  DISPATCHER: Route,
  DRIVER: Truck,
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: "Full access to every module and setting.",
  OPERATIONS_MANAGER: "Dashboard, orders, fulfilment, dispatch, fleet & reports.",
  FULFILMENT_OPERATOR: "Orders, fulfilment queue and inventory.",
  DISPATCHER: "Orders, dispatch workflow, drivers, vehicles and control tower.",
  DRIVER: "Their own assigned deliveries and profile.",
};

export default function LoginPage() {
  const router = useRouter();
  const login = useSession((s) => s.login);
  const [pickingDriver, setPickingDriver] = useState(false);
  const [drivers, setDrivers] = useState<Driver[] | null>(null);

  useEffect(() => {
    if (pickingDriver && !drivers) {
      getDrivers().then((d) => setDrivers([...d].sort((a, b) => a.fullName.localeCompare(b.fullName))));
    }
  }, [pickingDriver, drivers]);

  function handleLogin(role: UserRole) {
    if (role === "DRIVER") {
      setPickingDriver(true);
      return;
    }
    login(role);
    router.replace(defaultRouteForRole(role));
  }

  function handleDriverPick(driver: Driver) {
    login("DRIVER", { id: driver.id, fullName: driver.fullName });
    router.replace(defaultRouteForRole("DRIVER"));
  }

  if (pickingDriver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
              D
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in as a driver</h1>
            <p className="text-muted-foreground text-sm mt-1">Pick which driver you want to be signed in as for this demo session.</p>
          </div>

          <Button variant="ghost" size="sm" className="mb-3" onClick={() => setPickingDriver(false)}>
            <ArrowLeft className="h-4 w-4" /> Back to roles
          </Button>

          {!drivers ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading drivers…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {drivers.map((d) => (
                <Card
                  key={d.id}
                  className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
                  onClick={() => handleDriverPick(d)}
                >
                  <CardContent className="flex items-center gap-3 py-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={d.avatarUrl} alt={d.fullName} />
                      <AvatarFallback>{d.fullName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.currentLocationLabel}</p>
                    </div>
                    <DriverStatusBadge status={d.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
            D
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">DispatchOS</h1>
          <p className="text-muted-foreground text-sm mt-1">Last mile dispatch &amp; fulfilment control tower — sign in as a role to continue</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            return (
              <Card
                key={role}
                className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all"
                onClick={() => handleLogin(role)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{ROLE_LABELS[role]}</CardTitle>
                      <CardDescription className="text-xs">{role === "DRIVER" ? "Choose a driver…" : ROLE_DEMO_NAME[role]}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Demo mode — mock authentication. Real deployments wire this to Supabase Auth.
        </p>
      </div>
    </div>
  );
}
