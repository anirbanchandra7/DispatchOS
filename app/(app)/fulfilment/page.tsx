export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { FulfilmentBoard } from "@/components/fulfilment/fulfilment-board";
import { getFulfilmentBoard } from "@/lib/actions/fulfilment";

export default async function FulfilmentPage() {
  const cards = await getFulfilmentBoard();
  return (
    <div>
      <PageHeader title="Fulfilment" description="Orders requiring operational action, sorted by time received." />
      <FulfilmentBoard initialCards={cards} />
    </div>
  );
}
