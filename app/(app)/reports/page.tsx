export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/components/reports/reports-view";
import { getReportsData } from "@/lib/actions/reports";

export default async function ReportsPage() {
  const data = await getReportsData({ range: "today" });
  return (
    <div>
      <PageHeader title="Reports" description="Operational performance metrics across the business." />
      <ReportsView initialData={data} initialRange="today" />
    </div>
  );
}
