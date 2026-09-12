"use client";

import { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VehicleStatusBadge, DocumentStatusBadge } from "@/components/shared/status-badge";
import { UploadDocumentDialog } from "@/components/shared/upload-document-dialog";
import { DocumentViewerDialog } from "@/components/shared/document-viewer-dialog";
import { getVehicleById, uploadVehicleDocumentAction } from "@/lib/actions/vehicles";
import { useSession } from "@/lib/auth/session-store";
import { canManageVehicles, canViewVehicleDocuments } from "@/lib/auth/permissions";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import { Lock, Plus, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import type { CompanyVehicle, Driver, DocumentType } from "@/types";

const VEHICLE_DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "VEHICLE_INSURANCE", label: "Insurance" },
  { value: "VEHICLE_REGISTRATION", label: "Registration" },
  { value: "OTHER", label: "Other (e.g. inspection certificate)" },
];

export function VehicleDetailSheet({
  vehicleId,
  drivers,
  onOpenChange,
}: {
  vehicleId: string | null;
  drivers: Driver[];
  onOpenChange: (open: boolean) => void;
}) {
  const [vehicle, setVehicle] = useState<CompanyVehicle | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<CompanyVehicle["documents"][number] | null>(null);
  const role = useSession((s) => s.role);
  const canUpload = role ? canManageVehicles(role) : false;
  const canView = role ? canViewVehicleDocuments(role) : false;
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  const refresh = useCallback(async () => {
    if (!vehicleId) return;
    const v = await getVehicleById(vehicleId);
    setVehicle(v);
  }, [vehicleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const driver = vehicle?.currentDriverId ? drivers.find((d) => d.id === vehicle.currentDriverId) : undefined;

  return (
    <>
      <Sheet open={!!vehicleId} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {!vehicle ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {vehicle.make} {vehicle.model}
                  <VehicleStatusBadge status={vehicle.status} />
                </SheetTitle>
                <SheetDescription>{vehicle.registrationNumber} · {vehicle.vehicleType} · {vehicle.year}</SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Field label="Capacity" value={`${vehicle.capacityKg} kg`} />
                  <Field label="Current Driver" value={driver?.fullName ?? "Unassigned"} />
                  <Field label="Insurance Expiry" value={format(new Date(vehicle.insuranceExpiry), "MMM d, yyyy")} />
                  <Field label="Registration Expiry" value={format(new Date(vehicle.registrationExpiry), "MMM d, yyyy")} />
                  <Field label="Inspection Expiry" value={format(new Date(vehicle.inspectionExpiry), "MMM d, yyyy")} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1.5"><FileText className="h-4 w-4" /> Documents</p>
                  {canUpload && (
                    <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Upload
                    </Button>
                  )}
                </div>

                {!canView ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    Document viewing is restricted to Admin and Operations Manager.
                  </div>
                ) : vehicle.documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {vehicle.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{doc.type.replace(/_/g, " ")}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.fileName ?? "No file"} · Expires {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <DocumentStatusBadge status={doc.status} />
                          <Button size="icon-sm" variant="ghost" onClick={() => setViewingDoc(doc)} aria-label="View document">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {vehicle && (
        <UploadDocumentDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          title="Upload document"
          description="Add a new document to this vehicle's record."
          docTypes={VEHICLE_DOC_TYPES}
          onUpload={(input) =>
            uploadVehicleDocumentAction(
              vehicle.id,
              { type: input.type, expiryDate: input.expiryDate, fileName: input.fileName, mimeType: input.mimeType, dataUrl: input.dataUrl },
              role ?? "DISPATCHER",
              actor,
            )
          }
          onSaved={refresh}
        />
      )}
      <DocumentViewerDialog document={viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)} />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
