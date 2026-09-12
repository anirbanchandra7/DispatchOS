export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/lib/actions/dashboard";
import { CalendarDays } from "lucide-react";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your last mile operations at a glance"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Today ({today})
          </span>
        }
      />
      <DashboardView data={data} />
    </div>
  );
}
