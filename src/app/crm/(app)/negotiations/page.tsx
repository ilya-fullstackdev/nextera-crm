import { LeadsListPage } from "@/components/leads/leads-list-page";
import type { LeadsSearchParams } from "@/lib/leads-query";

export default function NegotiationsPage({ searchParams }: { searchParams: Promise<LeadsSearchParams> }) {
  return (
    <LeadsListPage
      title="Переговоры"
      baseStatuses={["NEGOTIATION", "PROPOSAL_SENT"]}
      searchParams={searchParams}
      hideStatusFilter
    />
  );
}
