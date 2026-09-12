"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import { getOrders } from "@/lib/actions/orders";
import { getDrivers } from "@/lib/actions/drivers";
import { getVehicles } from "@/lib/actions/vehicles";
import type { CompanyVehicle, Driver, Order } from "@/types";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openDialog() {
    setOpen(true);
    if (!loaded) {
      Promise.all([getOrders(), getDrivers(), getVehicles()]).then(([o, d, v]) => {
        setOrders(o);
        setDrivers(d);
        setVehicles(v);
        setLoaded(true);
      });
    }
  }

  const q = query.trim().toLowerCase();

  const matchedOrders = useMemo(() => {
    if (!q) return [];
    return orders
      .filter((o) => o.externalOrderId.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q))
      .slice(0, 5);
  }, [orders, q]);

  const matchedDrivers = useMemo(() => {
    if (!q) return [];
    return drivers.filter((d) => d.fullName.toLowerCase().includes(q) || d.phone.includes(q)).slice(0, 5);
  }, [drivers, q]);

  const matchedVehicles = useMemo(() => {
    if (!q) return [];
    return vehicles
      .filter((v) => v.registrationNumber.toLowerCase().includes(q) || `${v.make} ${v.model}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [vehicles, q]);

  function go(path: string, term: string) {
    setOpen(false);
    setQuery("");
    router.push(`${path}?q=${encodeURIComponent(term)}`);
  }

  return (
    <>
      <button
        onClick={openDialog}
        className="flex items-center gap-2 w-full max-w-md rounded-lg border bg-muted/40 px-3 h-9 text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">Search orders, drivers, vehicles…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search orders, drivers and vehicles">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search orders, drivers, vehicles…" value={query} onValueChange={setQuery} />
          <CommandList>
            {q && matchedOrders.length === 0 && matchedDrivers.length === 0 && matchedVehicles.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!q && <CommandEmpty>Type to search across orders, drivers and vehicles.</CommandEmpty>}

            {matchedOrders.length > 0 && (
              <CommandGroup heading="Orders">
                {matchedOrders.map((o) => (
                  <CommandItem key={o.id} value={o.id} onSelect={() => go("/orders", o.externalOrderId)}>
                    <span className="font-medium">{o.externalOrderId}</span>
                    <span className="text-muted-foreground">{o.customerName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedDrivers.length > 0 && (
              <CommandGroup heading="Drivers">
                {matchedDrivers.map((d) => (
                  <CommandItem key={d.id} value={d.id} onSelect={() => go("/drivers", d.fullName)}>
                    <span className="font-medium">{d.fullName}</span>
                    <span className="text-muted-foreground">{d.currentLocationLabel}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {matchedVehicles.length > 0 && (
              <CommandGroup heading="Vehicles">
                {matchedVehicles.map((v) => (
                  <CommandItem key={v.id} value={v.id} onSelect={() => go("/vehicles", v.registrationNumber)}>
                    <span className="font-medium">{v.registrationNumber}</span>
                    <span className="text-muted-foreground">{v.make} {v.model}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
