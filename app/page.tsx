"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-store";
import { defaultRouteForRole } from "@/lib/auth/permissions";

export default function RootPage() {
  const { role } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(role ? defaultRouteForRole(role) : "/login");
  }, [role, router]);

  return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
}
