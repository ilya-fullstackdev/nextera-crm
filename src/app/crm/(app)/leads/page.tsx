import { requireLeadsAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LeadsToolbar } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { Pagination } from "@/components/ui/pagination";
import { buildLeadsWhere, parseView, LEAD_VIEWS, PAGE_SIZE, type LeadsSearchParams } from "@/lib/leads-query";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadsSearchParams>;
}) {
  const user = await requireLeadsAccess();
  const params = await searchParams;
  const view = parseView(params.view);
  const where = buildLeadsWhere(user, params, view);
  const page = Math.max(1, Number(params.page ?? "1"));
  const isDirector = user.role === "DIRECTOR";

  const [leads, total, counts, owners] = await Promise.all([
    prisma.lead.findMany({
      where,
      // Сначала те, кому звонить раньше; без даты — в конце.
      orderBy: [{ nextContactAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        company: true,
        contact: true,
        owner: true,
        activities: { where: { type: "CALL" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.lead.count({ where }),
    // Счётчики на вкладках учитывают фильтры, но не вкладку и не поиск.
    Promise.all(
      LEAD_VIEWS.map((v) =>
        prisma.lead.count({ where: buildLeadsWhere(user, { ownerId: params.ownerId, mine: params.mine }, v.value) })
      )
    ),
    isDirector
      ? prisma.user.findMany({
          where: { deletedAt: null, status: "ACTIVE", role: { not: "HR" } },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <Topbar title={isDirector ? "Лиды" : "Мои лиды"} />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">
        <LeadsToolbar
          view={view}
          counts={Object.fromEntries(LEAD_VIEWS.map((v, i) => [v.value, counts[i]]))}
          owners={owners}
        />
        <div className="mt-3 rounded-lg border border-border-subtle bg-white shadow-xs">
          <LeadsTable leads={leads} currentUserRole={user.role} showOwner={isDirector} />
        </div>
        <div className="mt-3">
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} />
        </div>
      </div>
    </>
  );
}
