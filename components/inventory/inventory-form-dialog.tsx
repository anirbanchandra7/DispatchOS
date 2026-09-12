"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSkuAction, editSkuAction } from "@/lib/actions/inventory";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import type { InventoryItem } from "@/types";

interface FormState {
  sku: string;
  productName: string;
  category: string;
  unit: string;
  location: string;
  reorderThreshold: string;
  quantityOnHand: string;
}

const EMPTY: FormState = { sku: "", productName: "", category: "", unit: "unit", location: "Business Bay DC", reorderThreshold: "20", quantityOnHand: "0" };

export function InventoryFormDialog({
  open,
  onOpenChange,
  editItem,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: InventoryItem | null;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const role = useSession((s) => s.role);
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setForm({
        sku: editItem.sku,
        productName: editItem.productName,
        category: editItem.category,
        unit: editItem.unit,
        location: editItem.location,
        reorderThreshold: String(editItem.reorderThreshold),
        quantityOnHand: String(editItem.quantityOnHand),
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editItem]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!role) return;
    setSaving(true);
    const res = editItem
      ? await editSkuAction(
          editItem.sku,
          {
            productName: form.productName,
            category: form.category,
            unit: form.unit,
            location: form.location,
            reorderThreshold: Number(form.reorderThreshold) || 0,
          },
          role,
          actor,
        )
      : await createSkuAction(
          {
            sku: form.sku,
            productName: form.productName,
            category: form.category,
            unit: form.unit,
            location: form.location,
            reorderThreshold: Number(form.reorderThreshold) || 0,
            quantityOnHand: Number(form.quantityOnHand) || 0,
          },
          role,
          actor,
        );
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(editItem ? `${editItem.sku} updated` : `${form.sku.toUpperCase()} created`);
    onOpenChange(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? `Edit ${editItem.sku}` : "Add new SKU"}</DialogTitle>
          <DialogDescription>
            {editItem ? "Update product details. Quantity is changed via Restock/Adjust." : "Create a new inventory item."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {!editItem && (
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU code</Label>
              <Input id="sku" placeholder="BEV-011" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="productName">Product name</Label>
            <Input id="productName" value={form.productName} onChange={(e) => set("productName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="pack, kg, piece…" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorderThreshold">Reorder threshold</Label>
              <Input id="reorderThreshold" type="number" min={0} value={form.reorderThreshold} onChange={(e) => set("reorderThreshold", e.target.value)} />
            </div>
          </div>
          {!editItem && (
            <div className="space-y-1.5">
              <Label htmlFor="quantityOnHand">Initial quantity on hand</Label>
              <Input id="quantityOnHand" type="number" min={0} value={form.quantityOnHand} onChange={(e) => set("quantityOnHand", e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.productName.trim() || (!editItem && !form.sku.trim())}>
            {saving ? "Saving…" : editItem ? "Save changes" : "Create SKU"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
