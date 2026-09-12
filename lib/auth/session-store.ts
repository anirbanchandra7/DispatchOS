"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/types";
import { ROLE_DEMO_NAME } from "./roles";

interface SessionState {
  role: UserRole | null;
  fullName: string;
  driverId?: string;
  login: (role: UserRole, driver?: { id: string; fullName: string }) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      fullName: "",
      driverId: undefined,
      login: (role, driver) =>
        set({
          role,
          fullName: role === "DRIVER" && driver ? driver.fullName : ROLE_DEMO_NAME[role],
          driverId: role === "DRIVER" ? driver?.id : undefined,
        }),
      logout: () => set({ role: null, fullName: "", driverId: undefined }),
    }),
    { name: "dispatch-session" },
  ),
);
