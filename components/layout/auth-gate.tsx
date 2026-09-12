"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-store";
import { canAccessPath, defaultRouteForRole } from "@/lib/auth/permissions";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { role } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!role) {
      router.replace("/login");
      return;
    }
    if (!canAccessPath(role, pathname)) {
      router.replace(defaultRouteForRole(role));
    }
  }, [hydrated, role, pathname, router]);

  if (!hydrated || !role) {
    return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return <>{children}</>;
}
