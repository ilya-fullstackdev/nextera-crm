import { notFound } from "next/navigation";
import { requireLeadsAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { HANDOVER_ROLES } from "@/lib/permissions";
import { getPayoutRates } from "@/lib/payout-rates";
import { ROLE_LABELS } from "@/lib/labels";
import { Topbar } from "@/components/layout/topbar";
import { LeadDetailClient } from "@/components/leads/lead-detail/lead-detail-client";
import type { LeadDeal } from "@/components/leads/lead-detail/deal-panel";
import type { PayoutCandidate } from "@/components/leads/lead-detail/close-deal-modal";
import type { Role } from "@/generated/prisma/enums";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireLeadsAccess();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      owner: true,
      createdBy: { include: { hiredBy: true } },
      decisionMakers: true,
      activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      tasks: { orderBy: { dueAt: "asc" }, include: { assignee: true } },
      files: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
      handovers: { orderBy: { createdAt: "desc" }, include: { fromUser: true, toUser: true } },
      deal: {
        include: {
          closedBy: { select: { firstName: true, lastName: true } },
          payouts: {
            orderBy: { role: "asc" },
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          expenses: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!lead) notFound();

  // Лид принимает руководитель.
  const handoverTargets = await prisma.user.findMany({
    where: { role: { in: HANDOVER_ROLES }, status: "ACTIVE", deletedAt: null, id: { not: user.id } },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });

  const canEdit = user.role === "DIRECTOR" || lead.ownerId === user.id;
  const isDirector = user.role === "DIRECTOR";
  const canCloseDeal = isDirector && !lead.deal && lead.status !== "REJECTED";

  // Себе руководитель процент не платит, поэтому такие получатели не предлагаются.
  // Процент берётся из ставки должности — в карточке лида его не меняют.
  const rates = canCloseDeal ? await getPayoutRates() : null;

  const toCandidate = (
    u: { id: string; firstName: string; lastName: string; role: Role; deletedAt: Date | null } | null,
    kind: "finder" | "recruiter"
  ): PayoutCandidate | null => {
    if (!rates || !u || u.deletedAt || u.id === user.id) return null;
    const percent = kind === "finder" ? rates[u.role].finderPercent : rates[u.role].recruiterPercent;
    if (percent <= 0) return null;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      percent,
      roleLabel: ROLE_LABELS[u.role],
    };
  };

  const finder = toCandidate(lead.createdBy, "finder");
  const recruiterRaw = toCandidate(lead.createdBy.hiredBy, "recruiter");
  const recruiter = recruiterRaw && recruiterRaw.id !== lead.createdById ? recruiterRaw : null;

  const deal: LeadDeal | null = lead.deal
    ? {
        id: lead.deal.id,
        amount: lead.deal.amount,
        comment: lead.deal.comment,
        closedAt: lead.deal.closedAt.toISOString(),
        closedBy: lead.deal.closedBy,
        payouts: lead.deal.payouts.map((p) => ({
          id: p.id,
          role: p.role,
          percent: p.percent,
          amount: p.amount,
          status: p.status,
          user: p.user,
        })),
        expenses: lead.deal.expenses.map((e) => ({
          id: e.id,
          type: e.type,
          name: e.name,
          url: e.url,
          amount: e.amount,
          period: e.period,
          renewsAt: e.renewsAt ? e.renewsAt.toISOString() : null,
          comment: e.comment,
        })),
      }
    : null;

  return (
    <>
      <Topbar title={lead.company.name} />
      <div className="flex-1 overflow-y-auto">
        <LeadDetailClient
          lead={JSON.parse(JSON.stringify(lead))}
          recipients={JSON.parse(JSON.stringify(handoverTargets))}
          canEdit={canEdit}
          canCloseDeal={canCloseDeal}
          currentUser={user}
          deal={deal}
          finder={finder}
          recruiter={recruiter}
        />
      </div>
    </>
  );
}
