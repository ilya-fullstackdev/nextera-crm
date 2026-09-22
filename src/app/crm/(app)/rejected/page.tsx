import { LeadsListPage } from "@/components/leads/leads-list-page";
import type { LeadsSearchParams } from "@/lib/leads-query";

export default function RejectedPage({ searchParams }: { searchParams: Promise<LeadsSearchParams> }) {
  return (
    <LeadsListPage
      title="Отказы"
      baseStatuses={["REJECTED"]}
      searchParams={searchParams}
      hideStatusFilter
    />
  );
}
