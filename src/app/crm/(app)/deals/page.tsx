import { LeadsListPage } from "@/components/leads/leads-list-page";
import type { LeadsSearchParams } from "@/lib/leads-query";

export default function DealsPage({ searchParams }: { searchParams: Promise<LeadsSearchParams> }) {
  return (
    <LeadsListPage
      title="Сделки"
      baseStatuses={["DEAL"]}
      searchParams={searchParams}
      hideStatusFilter
    />
  );
}
