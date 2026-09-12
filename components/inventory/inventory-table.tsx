"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryFormDialog } from "@/components/inventory/inventory-form-dialog";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { InventoryTransactionsTable } from "@/components/inventory/inventory-transactions-table";
import { stockState } from "@/lib/inventory/reservation";
import { getInventory, getInventoryTransactions } from "@/lib/actions/inventory";
import { useSession } from "@/lib/auth/session-store";
import { canManageInventory } from "@/lib/auth/permissions";
import { useInterval } from "@/hooks/use-interval";
import { Search, Boxes, AlertTriangle, MoreVertical, Plus } from "lucide-react";
import { format } from "date-fns";
import type { InventoryItem, InventoryTransaction } from "@/types";

const STOCK_STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  LOW_STOCK: "bg-amber-50 text-amber-700 border-amber-200",
  OUT_OF_STOCK: "bg-red-50 text-red-700 border-red-200",
};

const STOCK_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export function InventoryTable({ items: initialItems }: { items: InventoryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [tab, setTab] = useState("stock");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  const role = useSession((s) => s.role);
  const manager = role ? canManageInventory(role) : false;

  const refresh = async () => setItems(await getInventory());
  useInterval(refresh, 8000);

  useEffect(() => {
    if (tab === "transactions") {
      getInventoryTransactions().then(setTransactions);
    }
  }, [tab]);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const lowStockItems = useMemo(() => items.filter((i) => stockState(i) !== "AVAILABLE"), [items]);

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (category !== "ALL" && i.category !== category) return false;
        if (search && !i.productName.toLowerCase().includes(search.toLowerCase()) && !i.sku.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [items, search, category],
  );

  async function handleSaved() {
    await refresh();
    if (tab === "transactions") setTransactions(await getInventoryTransactions());
  }

  return (
    <div className="space-y-4">
      {lowStockItems.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">{lowStockItems.length} SKUs need attention</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lowStockItems.slice(0, 10).map((i) => (
              <Badge key={i.id} variant="outline" className={STOCK_STYLES[stockState(i)]}>
                {i.sku} · {i.productName}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "stock")}>
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          {manager && tab === "stock" && (
            <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Add SKU
            </Button>
          )}
        </div>

        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search SKU or product…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "ALL")}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState icon={Boxes} title="No inventory items match your filters" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>On Hand</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      {manager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => {
                      const state = stockState(i);
                      const available = i.quantityOnHand - i.reservedQuantity;
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.sku}</TableCell>
                          <TableCell>{i.productName}</TableCell>
                          <TableCell className="text-muted-foreground">{i.category}</TableCell>
                          <TableCell>{i.quantityOnHand} {i.unit}</TableCell>
                          <TableCell>{i.reservedQuantity}</TableCell>
                          <TableCell className="font-medium">{available}</TableCell>
                          <TableCell className="text-muted-foreground">{i.location}</TableCell>
                          <TableCell><Badge variant="outline" className={STOCK_STYLES[state]}>{STOCK_LABELS[state]}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{format(new Date(i.updatedAt), "MMM d, HH:mm")}</TableCell>
                          {manager && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setAdjustItem(i)}>Restock / Adjust</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditItem(i); setFormOpen(true); }}>Edit details</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <InventoryTransactionsTable transactions={transactions} />
        </TabsContent>
      </Tabs>

      <InventoryFormDialog open={formOpen} onOpenChange={setFormOpen} editItem={editItem} onSaved={handleSaved} />
      <StockAdjustDialog open={!!adjustItem} onOpenChange={(open) => !open && setAdjustItem(null)} item={adjustItem} onSaved={handleSaved} />
    </div>
  );
}
