import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { SearchBox } from "@/components/shared/search-box";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { Pagination } from "@/components/ui/pagination";
import { buildLeadsWhere, PAGE_SIZE, type LeadsSearchParams } from "@/lib/leads-query";
import type { LeadStatus } from "@/generated/prisma/enums";

export async function LeadsListPage({
  title,
  baseStatuses,
  searchParams,
  hideStatusFilter,
  ownerScope = "owner",
}: {
  title: string;
  baseStatuses?: LeadStatus[];
  searchParams: Promise<LeadsSearchParams>;
  hideStatusFilter?: boolean;
  ownerScope?: "owner" | "handedFrom";
}) {
  const user = await requireUser();
  const params = await searchParams;
  const where = buildLeadsWhere(user, params, baseStatuses, ownerScope);
  const page = Math.max(1, Number(params.page ?? "1"));

  const [leads, total, owners] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        company: true,
        contact: true,
        owner: true,
        activities: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.lead.count({ where }),
    prisma.user.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <>
      <Topbar title={title} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <SearchBox placeholder="Поиск по компании, контакту, телефону" />
        </div>
        <div className="mb-4">
          <LeadFilters owners={owners} hideStatus={hideStatusFilter} />
        </div>
        <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
          <LeadsTable leads={leads} currentUserRole={user.role} />
        </div>
        <div className="mt-3">
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} />
        </div>
      </div>
    </>
  );
}
