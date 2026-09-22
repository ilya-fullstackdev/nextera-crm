import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/topbar";
import { LeadDetailClient } from "@/components/leads/lead-detail/lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      owner: true,
      createdBy: true,
      decisionMakers: true,
      activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      tasks: { orderBy: { dueAt: "asc" }, include: { assignee: true } },
      files: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
      handovers: { orderBy: { createdAt: "desc" }, include: { fromUser: true, toUser: true } },
    },
  });

  if (!lead) notFound();

  const [contacts, managers] = await Promise.all([
    prisma.contact.findMany({ where: { companyId: lead.companyId } }),
    prisma.user.findMany({ where: { role: "MANAGER", status: "ACTIVE", deletedAt: null } }),
  ]);

  const canEdit = user.role === "DIRECTOR" || lead.ownerId === user.id;

  return (
    <>
      <Topbar title={lead.company.name} />
      <div className="flex-1 overflow-y-auto">
        <LeadDetailClient
          lead={JSON.parse(JSON.stringify(lead))}
          companyContacts={JSON.parse(JSON.stringify(contacts))}
          managers={JSON.parse(JSON.stringify(managers))}
          canEdit={canEdit}
          currentUser={user}
        />
      </div>
    </>
  );
}
