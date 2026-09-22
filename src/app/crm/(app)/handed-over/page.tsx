import { LeadsListPage } from "@/components/leads/leads-list-page";
import type { LeadsSearchParams } from "@/lib/leads-query";

export default function HandedOverPage({ searchParams }: { searchParams: Promise<LeadsSearchParams> }) {
  return (
    <LeadsListPage
      title="Переданные менеджеру"
      searchParams={searchParams}
      ownerScope="handedFrom"
    />
  );
}
