import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { SearchBox } from "@/components/shared/search-box";
import { NewCompanyButton } from "@/components/companies/new-company-button";
import { CompaniesTable } from "@/components/companies/companies-table";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;

  const companies = await prisma.company.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { website: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { contacts: true, leads: true } } },
  });

  return (
    <>
      <Topbar title="Компании" />
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SearchBox placeholder="Поиск по названию, сайту, городу" />
          <NewCompanyButton />
        </div>
        <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
          <CompaniesTable companies={companies} currentUserRole={user.role} />
        </div>
      </div>
    </>
  );
}
