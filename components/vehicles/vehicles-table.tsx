"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleStatusBadge, DocumentStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AddVehicleDialog } from "@/components/vehicles/add-vehicle-dialog";
import { VehicleDetailSheet } from "@/components/vehicles/vehicle-detail-sheet";
import { getVehicles } from "@/lib/actions/vehicles";
import { useSession } from "@/lib/auth/session-store";
import { canManageVehicles } from "@/lib/auth/permissions";
import { Car, Plus, Search } from "lucide-react";
import type { CompanyVehicle, Driver, DriverOwnedVehicle } from "@/types";

export function VehiclesTable({
  vehicles: initialVehicles,
  ownedVehicles,
  drivers,
}: {
  vehicles: CompanyVehicle[];
  ownedVehicles: DriverOwnedVehicle[];
  drivers: Driver[];
}) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("company");
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const role = useSession((s) => s.role);
  const canAdd = role ? canManageVehicles(role) : false;

  const refresh = async () => setVehicles(await getVehicles());

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter((v) => v.registrationNumber.toLowerCase().includes(q) || `${v.make} ${v.model}`.toLowerCase().includes(q));
  }, [vehicles, search]);

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "company")}>
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="company">Company Fleet ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="owned">Driver-Owned ({ownedVehicles.length})</TabsTrigger>
          </TabsList>
          {canAdd && tab === "company" && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Vehicle
            </Button>
          )}
        </div>

        <TabsContent value="company" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search registration, make or model…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            {filteredVehicles.length === 0 ? (
              <EmptyState icon={Car} title="No company vehicles match your search" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Insurance</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Inspection</TableHead>
                      <TableHead>Current Driver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.map((v) => {
                      const driver = drivers.find((d) => d.id === v.currentDriverId);
                      const insuranceDoc = v.documents.find((d) => d.type === "VEHICLE_INSURANCE");
                      const regDoc = v.documents.find((d) => d.type === "VEHICLE_REGISTRATION");
                      return (
                        <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelectedVehicleId(v.id)}>
                          <TableCell>
                            <p className="font-medium text-sm">{v.make} {v.model}</p>
                            <p className="text-xs text-muted-foreground">{v.registrationNumber}</p>
                          </TableCell>
                          <TableCell>{v.vehicleType}</TableCell>
                          <TableCell>{v.capacityKg}kg</TableCell>
                          <TableCell><VehicleStatusBadge status={v.status} /></TableCell>
                          <TableCell>{insuranceDoc ? <DocumentStatusBadge status={insuranceDoc.status} /> : <span className="text-xs text-muted-foreground">Not uploaded</span>}</TableCell>
                          <TableCell>{regDoc ? <DocumentStatusBadge status={regDoc.status} /> : <span className="text-xs text-muted-foreground">Not uploaded</span>}</TableCell>
                          <TableCell>{new Date(v.inspectionExpiry) > new Date() ? "Valid" : "Expired"}</TableCell>
                          <TableCell className="text-muted-foreground">{driver?.fullName ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="owned" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            {ownedVehicles.length === 0 ? (
              <EmptyState icon={Car} title="No driver-owned vehicles" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Insurance</TableHead>
                      <TableHead>Registration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownedVehicles.map((v) => {
                      const driver = drivers.find((d) => d.id === v.driverId);
                      const insuranceDoc = v.documents.find((d) => d.type === "VEHICLE_INSURANCE");
                      const regDoc = v.documents.find((d) => d.type === "VEHICLE_REGISTRATION");
                      return (
                        <TableRow key={v.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{v.make} {v.model}</p>
                            <p className="text-xs text-muted-foreground">{v.registrationNumber}</p>
                          </TableCell>
                          <TableCell>{driver?.fullName ?? "—"}</TableCell>
                          <TableCell>{v.vehicleType}</TableCell>
                          <TableCell><VehicleStatusBadge status={v.status} /></TableCell>
                          <TableCell>{insuranceDoc && <DocumentStatusBadge status={insuranceDoc.status} />}</TableCell>
                          <TableCell>{regDoc && <DocumentStatusBadge status={regDoc.status} />}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AddVehicleDialog open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
      <VehicleDetailSheet vehicleId={selectedVehicleId} drivers={drivers} onOpenChange={(open) => !open && setSelectedVehicleId(null)} />
    </>
  );
}
