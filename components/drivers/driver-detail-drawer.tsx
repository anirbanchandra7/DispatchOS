"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DriverStatusBadge, DocumentStatusBadge, VehicleStatusBadge } from "@/components/shared/status-badge";
import { UploadDocumentDialog } from "@/components/shared/upload-document-dialog";
import { DocumentViewerDialog, type ViewableDocument } from "@/components/shared/document-viewer-dialog";
import { getDriverById, uploadDriverDocumentAction } from "@/lib/actions/drivers";
import { useSession } from "@/lib/auth/session-store";
import { canManageDriverDocuments, canViewDriverDocuments } from "@/lib/auth/permissions";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import { format } from "date-fns";
import { ShieldCheck, Lock, Plus, Eye } from "lucide-react";
import type { AuditEntry, DocumentType, Driver, DriverOwnedVehicle } from "@/types";

const DRIVER_DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
  { value: "ID_DOCUMENT", label: "ID Document" },
  { value: "OTHER", label: "Other" },
];

export function DriverDetailDrawer({ driverId, onOpenChange }: { driverId: string | null; onOpenChange: (open: boolean) => void }) {
  const [data, setData] = useState<{ driver: Driver; ownedVehicle?: DriverOwnedVehicle; audit: AuditEntry[] } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<ViewableDocument | null>(null);
  const role = useSession((s) => s.role);
  const canManage = role ? canManageDriverDocuments(role) : false;
  const canView = role ? canViewDriverDocuments(role) : false;
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  const refresh = useCallback(async () => {
    if (!driverId) return;
    const res = await getDriverById(driverId);
    setData(res as typeof data);
  }, [driverId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <Sheet open={!!driverId} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {!data ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={data.driver.avatarUrl} alt={data.driver.fullName} />
                    <AvatarFallback>{data.driver.fullName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>{data.driver.fullName}</SheetTitle>
                    <SheetDescription>{data.driver.phone} · {data.driver.employmentType.replace("_", " ")}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-5">
                <div className="flex items-center gap-2">
                  <DriverStatusBadge status={data.driver.status} />
                  <span className="text-xs text-muted-foreground">{data.driver.currentLocationLabel}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="Deliveries" value={data.driver.deliveryCount} />
                  <Stat label="Successful" value={data.driver.successfulDeliveries} />
                  <Stat label="Rating" value={`${data.driver.rating.toFixed(1)} ★`} />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Documents</p>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Upload / Renew
                      </Button>
                    )}
                  </div>

                  {!canView ? (
                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                      <Lock className="h-4 w-4" />
                      Document viewing is restricted to Admin and Operations Manager.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.driver.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium">{doc.type.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.expiryDate ? `Expires ${format(new Date(doc.expiryDate), "MMM d, yyyy")}` : "No expiry"}
                              {doc.fileName ? ` · ${doc.fileName}` : ""}
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

                {data.ownedVehicle && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Own Vehicle</p>
                      <div className="rounded-md border p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{data.ownedVehicle.make} {data.ownedVehicle.model}</span>
                          <VehicleStatusBadge status={data.ownedVehicle.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{data.ownedVehicle.registrationNumber} · {data.ownedVehicle.vehicleType}</p>
                        <div className="flex gap-4 pt-1">
                          {data.ownedVehicle.documents.map((doc) => (
                            <div key={doc.id} className="text-xs">
                              <span className="text-muted-foreground">{doc.type === "VEHICLE_INSURANCE" ? "Insurance" : "Registration"}: </span>
                              <DocumentStatusBadge status={doc.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {data.audit.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Recent Activity</p>
                      <div className="space-y-2">
                        {data.audit.slice(0, 10).map((a) => (
                          <div key={a.id} className="text-xs flex justify-between">
                            <span>{a.action}</span>
                            <span className="text-muted-foreground">{format(new Date(a.timestamp), "HH:mm")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {data && (
        <UploadDocumentDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          title="Upload / renew document"
          description="Uploading a document of a type the driver already has replaces the existing one (e.g. renewing an expiring licence)."
          docTypes={DRIVER_DOC_TYPES}
          requireDocumentNumber
          documentNumberLabel="Document number"
          onUpload={(input) =>
            uploadDriverDocumentAction(
              data.driver.id,
              {
                type: input.type,
                documentNumber: input.documentNumber ?? "",
                expiryDate: input.expiryDate,
                fileName: input.fileName,
                mimeType: input.mimeType,
                dataUrl: input.dataUrl,
              },
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/50 py-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
