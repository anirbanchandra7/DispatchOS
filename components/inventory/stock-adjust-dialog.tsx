"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { restockAction, adjustStockAction } from "@/lib/actions/inventory";
import { useSession } from "@/lib/auth/session-store";
import { ROLE_DEMO_NAME } from "@/lib/auth/roles";
import type { InventoryItem } from "@/types";

export function StockAdjustDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSaved: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"restock" | "adjust">("restock");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const role = useSession((s) => s.role);
  const actor = role ? ROLE_DEMO_NAME[role] : "Operator";

  useEffect(() => {
    if (open) {
      setMode("restock");
      setQuantity("");
      setReason("");
    }
  }, [open]);

  if (!item) return null;

  async function handleSave() {
    if (!role || !item) return;
    const qty = Number(quantity);
    if (!qty) return toast.error("Enter a quantity");
    setSaving(true);
    const res =
      mode === "restock"
        ? await restockAction(item.sku, Math.abs(qty), role, actor, reason || undefined)
        : await adjustStockAction(item.sku, qty, role, actor, reason);
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(mode === "restock" ? `${item.sku} restocked +${Math.abs(qty)} ${item.unit}` : `${item.sku} adjusted ${qty > 0 ? "+" : ""}${qty} ${item.unit}`);
    onOpenChange(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.sku} · {item.productName}</DialogTitle>
          <DialogDescription>
            Currently {item.quantityOnHand} {item.unit} on hand, {item.reservedQuantity} reserved.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode((v as "restock" | "adjust") ?? "restock")}>
          <TabsList className="w-full">
            <TabsTrigger value="restock" className="flex-1">Restock</TabsTrigger>
            <TabsTrigger value="adjust" className="flex-1">Adjust count</TabsTrigger>
          </TabsList>

          <TabsContent value="restock" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="restock-qty">Quantity received</Label>
              <Input id="restock-qty" type="number" min={1} placeholder="e.g. 50" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="restock-note">Note (optional)</Label>
              <Input id="restock-note" placeholder="Supplier delivery reference…" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="adjust" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="adjust-qty">Adjustment (use a negative number to reduce)</Label>
              <Input id="adjust-qty" type="number" placeholder="e.g. -5" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-note">Reason (required)</Label>
              <Input id="adjust-note" placeholder="Stock count correction, damaged goods…" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !quantity || (mode === "adjust" && !reason.trim())}>
            {saving ? "Saving…" : mode === "restock" ? "Restock" : "Apply adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
