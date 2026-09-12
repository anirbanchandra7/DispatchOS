"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { createVehicleAction, type DocumentUploadInput } from "@/lib/actions/vehicles";
import { readFileAsDataUrl } from "@/lib/read-file";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import type { DocumentType, VehicleType } from "@/types";

const VEHICLE_TYPES: VehicleType[] = ["MOTORBIKE", "SCOOTER", "CAR", "VAN", "TRUCK", "BICYCLE"];

interface FormState {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  vehicleType: VehicleType;
  capacityKg: string;
  insuranceExpiry: string;
  registrationExpiry: string;
  inspectionExpiry: string;
}

const EMPTY: FormState = {
  registrationNumber: "",
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  vehicleType: "VAN",
  capacityKg: "500",
  insuranceExpiry: "",
  registrationExpiry: "",
  inspectionExpiry: "",
};

interface DocSlot {
  type: DocumentType;
  label: string;
  file: File | null;
}

const INITIAL_SLOTS: DocSlot[] = [
  { type: "VEHICLE_REGISTRATION", label: "Registration document", file: null },
  { type: "VEHICLE_INSURANCE", label: "Insurance document", file: null },
  { type: "OTHER", label: "Inspection certificate", file: null },
];

export function AddVehicleDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slots, setSlots] = useState<DocSlot[]>(INITIAL_SLOTS);
  const [saving, setSaving] = useState(false);
  const role = useSession((s) => s.role);
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSlotFile(type: DocumentType, file: File | null) {
    setSlots((s) => s.map((slot) => (slot.type === type ? { ...slot, file } : slot)));
  }

  function reset() {
    setForm(EMPTY);
    setSlots(INITIAL_SLOTS);
  }

  async function handleSave() {
    if (!role) return;
    setSaving(true);
    try {
      const documents: DocumentUploadInput[] = [];
      for (const slot of slots) {
        if (!slot.file) continue;
        const expiryDate =
          slot.type === "VEHICLE_INSURANCE" ? form.insuranceExpiry : slot.type === "VEHICLE_REGISTRATION" ? form.registrationExpiry : form.inspectionExpiry;
        if (!expiryDate) {
          toast.error(`Set an expiry date before uploading the ${slot.label.toLowerCase()}`);
          setSaving(false);
          return;
        }
        const dataUrl = await readFileAsDataUrl(slot.file);
        documents.push({ type: slot.type, expiryDate, fileName: slot.file.name, mimeType: slot.file.type || "application/octet-stream", dataUrl });
      }

      const res = await createVehicleAction(
        {
          registrationNumber: form.registrationNumber,
          make: form.make,
          model: form.model,
          year: Number(form.year) || new Date().getFullYear(),
          vehicleType: form.vehicleType,
          capacityKg: Number(form.capacityKg) || 0,
          insuranceExpiry: new Date(form.insuranceExpiry || Date.now()).toISOString(),
          registrationExpiry: new Date(form.registrationExpiry || Date.now()).toISOString(),
          inspectionExpiry: new Date(form.inspectionExpiry || Date.now()).toISOString(),
        },
        documents,
        role,
        actor,
      );

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${form.registrationNumber.toUpperCase()} added to the fleet`);
      onOpenChange(false);
      reset();
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    form.registrationNumber.trim() && form.make.trim() && form.model.trim() && form.insuranceExpiry && form.registrationExpiry && form.inspectionExpiry;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add company vehicle</DialogTitle>
          <DialogDescription>Register a new vehicle to the fleet and optionally upload its documents.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="registrationNumber">Registration number</Label>
              <Input id="registrationNumber" placeholder="DXB-9012" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicleType">Vehicle type</Label>
              <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", (v as VehicleType) ?? "VAN")}>
                <SelectTrigger id="vehicleType" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="make">Make</Label>
              <Input id="make" placeholder="Toyota" value={form.make} onChange={(e) => set("make", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" placeholder="Hiace" value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" value={form.year} onChange={(e) => set("year", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacityKg">Capacity (kg)</Label>
            <Input id="capacityKg" type="number" min={0} value={form.capacityKg} onChange={(e) => set("capacityKg", e.target.value)} />
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents &amp; expiry dates</p>

          <DocRow
            label="Insurance"
            expiry={form.insuranceExpiry}
            onExpiryChange={(v) => set("insuranceExpiry", v)}
            file={slots.find((s) => s.type === "VEHICLE_INSURANCE")?.file ?? null}
            onFile={(f) => setSlotFile("VEHICLE_INSURANCE", f)}
          />
          <DocRow
            label="Registration"
            expiry={form.registrationExpiry}
            onExpiryChange={(v) => set("registrationExpiry", v)}
            file={slots.find((s) => s.type === "VEHICLE_REGISTRATION")?.file ?? null}
            onFile={(f) => setSlotFile("VEHICLE_REGISTRATION", f)}
          />
          <DocRow
            label="Inspection"
            expiry={form.inspectionExpiry}
            onExpiryChange={(v) => set("inspectionExpiry", v)}
            file={slots.find((s) => s.type === "OTHER")?.file ?? null}
            onFile={(f) => setSlotFile("OTHER", f)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !canSubmit}>
            {saving ? "Saving…" : "Add Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocRow({
  label,
  expiry,
  onExpiryChange,
  file,
  onFile,
}: {
  label: string;
  expiry: string;
  onExpiryChange: (v: string) => void;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputId = `doc-${label.toLowerCase()}`;
  return (
    <div className="grid grid-cols-2 gap-3 items-end rounded-md border p-2.5">
      <div className="space-y-1.5">
        <Label htmlFor={`${inputId}-expiry`} className="text-xs">{label} expiry</Label>
        <Input id={`${inputId}-expiry`} type="date" value={expiry} onChange={(e) => onExpiryChange(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-xs">{label} document (optional)</Label>
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-dashed text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 truncate"
        >
          {file ? <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <UploadCloud className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{file ? file.name : "Choose file…"}</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
