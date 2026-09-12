"use client";

import { Star, Car, Bike, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import type { VehicleOption } from "@/types";

function iconFor(type: VehicleOption["vehicleType"]) {
  if (type === "CAR") return Car;
  if (type === "TRUCK" || type === "VAN") return Truck;
  return Bike;
}

export function VehiclePicker({
  options,
  selectedId,
  onSelect,
}: {
  options: VehicleOption[];
  selectedId?: string;
  onSelect: (option: VehicleOption) => void;
}) {
  if (options.length === 0) {
    return <EmptyState title="No available vehicles" description="No eligible vehicle is currently available for this order." />;
  }

  const own = options.filter((o) => o.ownership === "DRIVER_OWNED");
  const company = options.filter((o) => o.ownership === "COMPANY");

  return (
    <div className="space-y-4">
      {own.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Own Vehicle</p>
          <div className="space-y-2">
            {own.map((o) => (
              <VehicleRow key={o.id} option={o} selected={selectedId === o.id} onSelect={() => onSelect(o)} />
            ))}
          </div>
        </div>
      )}
      {company.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Company Vehicles</p>
          <div className="space-y-2">
            {company.map((o) => (
              <VehicleRow key={o.id} option={o} selected={selectedId === o.id} onSelect={() => onSelect(o)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleRow({ option, selected, onSelect }: { option: VehicleOption; selected: boolean; onSelect: () => void }) {
  const Icon = iconFor(option.vehicleType);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-accent" : "hover:bg-muted/60",
      )}
    >
      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {option.make} {option.model}
          </p>
          {option.recommended && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Recommended
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {option.registrationNumber} · {option.ownership === "DRIVER_OWNED" ? "Driver Owned" : "Company"} · {option.capacityKg}kg capacity
        </p>
      </div>
      <span className="text-[11px] font-medium text-emerald-600 shrink-0">{option.statusLabel}</span>
    </button>
  );
}
