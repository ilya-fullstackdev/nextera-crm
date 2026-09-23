import "server-only";
import { prisma } from "@/lib/prisma";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import type { CurrentUser } from "@/lib/auth/current-user";
import { AUTO_FLOW, MANUAL_ONLY, deriveStatus } from "@/lib/lead-steps";
import type { ActivityType, LeadStatus } from "@/generated/prisma/enums";

/**
 * Автоматическое движение лида по воронке.
 *
 * Статус выводится из того, что уже заполнено в карточке: не нужно помнить,
 * что после добавления ЛПР надо руками переключить стадию. Правила работают
 * только «вперёд» — руками поставленный статус автоматика не откатывает.
 */

/** Активности, которые считаются попыткой связаться с клиентом. */
const CONTACT_ACTIVITIES: ActivityType[] = ["CALL", "MESSAGE", "EMAIL", "MEETING"];

/**
 * Пересчитывает статус лида и двигает его, если данные ушли вперёд.
 * Возвращает новый статус либо null, если ничего менять не нужно.
 */
export async function applyAutoStatus(leadId: string, actor: CurrentUser): Promise<LeadStatus | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      _count: { select: { decisionMakers: true, files: true } },
      activities: { select: { type: true } },
    },
  });
  if (!lead) return null;

  // Руками выставленные стадии автоматика не трогает.
  if (MANUAL_ONLY.includes(lead.status)) return null;

  const target = deriveStatus({
    dmStatus: lead.dmStatus,
    needLevel: lead.needLevel,
    timeline: lead.timeline,
    budgetStatus: lead.budgetStatus,
    contactAttempts: lead.contactAttempts,
    decisionMakersCount: lead._count.decisionMakers,
    hasContactActivity: lead.activities.some((a) => CONTACT_ACTIVITIES.includes(a.type)),
    hasAnyWork:
      lead._count.files > 0 || lead.activities.some((a) => a.type !== "STATUS_CHANGE"),
  });

  if (AUTO_FLOW.indexOf(target) <= AUTO_FLOW.indexOf(lead.status)) return null;

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status: target } }),
    prisma.leadActivity.create({
      data: {
        leadId,
        userId: actor.id,
        type: "STATUS_CHANGE",
        comment: `Статус обновлён автоматически: ${LEAD_STATUS_LABELS[lead.status]} → ${LEAD_STATUS_LABELS[target]}`,
        metadata: { fromStatus: lead.status, toStatus: target, auto: true },
      },
    }),
  ]);

  return target;
}
