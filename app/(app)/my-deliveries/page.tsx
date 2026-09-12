"use client";

import { PageHeader } from "@/components/shared/page-header";
import { MyDeliveriesView } from "@/components/drivers/my-deliveries-view";

export default function MyDeliveriesPage() {
  return (
    <div>
      <PageHeader title="My Deliveries" description="Your assigned deliveries and profile." />
      <MyDeliveriesView />
    </div>
  );
}
