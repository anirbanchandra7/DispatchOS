"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import type { DriverOption } from "@/types";

export function DriverPicker({
  options,
  selectedId,
  onSelect,
}: {
  options: DriverOption[];
  selectedId?: string;
  onSelect: (option: DriverOption) => void;
}) {
  if (options.length === 0) {
    return <EmptyState title="No available drivers" description="No driver is currently available near the pickup location." />;
  }

  return (
    <div className="space-y-2">
      {options.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onSelect(d)}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
            selectedId === d.id ? "border-primary bg-accent" : "hover:bg-muted/60",
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={d.avatarUrl} alt={d.fullName} />
            <AvatarFallback>{d.fullName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{d.fullName}</p>
              {d.recommended && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Recommended
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {d.distanceKm} km away · {d.currentVehicleLabel ?? "No vehicle"} · {d.deliveryCount} deliveries
            </p>
          </div>
          <span className="text-[11px] font-medium text-emerald-600 shrink-0">{d.activeDeliveries === 0 ? "0 active" : `${d.activeDeliveries} active`}</span>
        </button>
      ))}
    </div>
  );
}
