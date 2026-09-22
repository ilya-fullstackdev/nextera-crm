import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { SearchBox } from "@/components/shared/search-box";
import { ContactsTable } from "@/components/contacts/contacts-table";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;

  const contacts = await prisma.contact.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { telegram: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { company: true, leads: { select: { id: true } } },
  });

  return (
    <>
      <Topbar title="Контакты" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SearchBox placeholder="Поиск по имени, телефону, email" />
        </div>
        <div className="rounded-lg border border-border-subtle bg-white shadow-xs">
          <ContactsTable contacts={contacts} currentUserRole={user.role} />
        </div>
      </div>
    </>
  );
}
