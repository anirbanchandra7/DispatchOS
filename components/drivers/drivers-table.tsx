"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DriverStatusBadge, DocumentStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DriverDetailDrawer } from "@/components/drivers/driver-detail-drawer";
import { Search, Users } from "lucide-react";
import type { Driver, DriverStatus } from "@/types";

export function DriversTable({ drivers }: { drivers: Driver[] }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState<DriverStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      drivers.filter((d) => {
        if (status !== "ALL" && d.status !== status) return false;
        if (search && !d.fullName.toLowerCase().includes(search.toLowerCase()) && !d.phone.includes(search)) return false;
        return true;
      }),
    [drivers, search, status],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search drivers…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as DriverStatus | "ALL")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>{(v: string | null) => (v && v !== "ALL" ? v.replace(/_/g, " ") : "All statuses")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="BUSY">Busy</SelectItem>
            <SelectItem value="ON_BREAK">On Break</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No drivers match your filters" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Own Vehicle</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Deliveries</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const licenceDoc = d.documents.find((doc) => doc.type === "DRIVING_LICENCE");
                  return (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelectedId(d.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={d.avatarUrl} alt={d.fullName} />
                            <AvatarFallback>{d.fullName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{d.fullName}</p>
                            <p className="text-xs text-muted-foreground">{d.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><DriverStatusBadge status={d.status} /></TableCell>
                      <TableCell>{d.hasOwnVehicle ? "Yes" : "No"}</TableCell>
                      <TableCell>{licenceDoc && <DocumentStatusBadge status={licenceDoc.status} />}</TableCell>
                      <TableCell>{d.deliveryCount}</TableCell>
                      <TableCell>{d.rating.toFixed(1)} ★</TableCell>
                      <TableCell className="text-muted-foreground">{d.currentLocationLabel}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <DriverDetailDrawer driverId={selectedId} onOpenChange={(open) => !open && setSelectedId(null)} />
    </div>
  );
}
