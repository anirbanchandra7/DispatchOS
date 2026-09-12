"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { History } from "lucide-react";
import { format } from "date-fns";
import type { InventoryTransaction } from "@/types";

const TYPE_STYLES: Record<string, string> = {
  RESERVE: "bg-blue-50 text-blue-700 border-blue-200",
  RELEASE: "bg-gray-100 text-gray-600 border-gray-200",
  DEDUCT: "bg-purple-50 text-purple-700 border-purple-200",
  RESTOCK: "bg-green-50 text-green-700 border-green-200",
  ADJUSTMENT: "bg-amber-50 text-amber-700 border-amber-200",
};

export function InventoryTransactionsTable({ transactions }: { transactions: InventoryTransaction[] }) {
  if (transactions.length === 0) {
    return <EmptyState icon={History} title="No transactions yet" description="Reservations, restocks and adjustments will appear here." />;
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{format(new Date(t.createdAt), "MMM d, HH:mm")}</TableCell>
                <TableCell className="font-medium">{t.sku}</TableCell>
                <TableCell><Badge variant="outline" className={TYPE_STYLES[t.type]}>{t.type}</Badge></TableCell>
                <TableCell>{t.type === "RESTOCK" || t.quantity > 0 ? "+" : ""}{t.quantity}</TableCell>
                <TableCell className="text-muted-foreground">{t.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
