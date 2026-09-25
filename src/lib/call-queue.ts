import "server-only";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Очередь звонков — главный экран оператора.
 *
 * Единственный источник «кому звонить» — дата следующего звонка у лида
 * (`nextContactAt`). Её ставит сам итог звонка, поэтому очередь наполняется
 * без ручных задач. Лид в работе без даты тоже попадает в очередь: у нас не
 * бывает клиентов, которым не собираются звонить.
 */

/** Лиды в этих статусах в очередь не попадают: работа по ним закончена. */
const CLOSED_STATUSES = ["REJECTED", "DEAL"] as const;
/** Лидами на этих этапах занимается руководитель, а не оператор. */
const AT_MANAGER = ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"] as const;

export interface QueueItem {
  id: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  status: string;
  nextContactAt: string | null;
  lastCall: { comment: string | null; createdAt: string } | null;
  /** Звонок был назначен на прошлые дни. */
  overdue: boolean;
  /** По лиду ещё ни разу не звонили. */
  fresh: boolean;
}

export function queueWhere(ownerId: string, isDirector: boolean): Prisma.LeadWhereInput {
  const todayEnd = endOfDay(new Date());
  return {
    ownerId,
    status: { notIn: isDirector ? [...CLOSED_STATUSES] : [...CLOSED_STATUSES, ...AT_MANAGER] },
    OR: [
      { nextContactAt: { lte: todayEnd } },
      { nextContactAt: null },
      // Звонки, назначенные раньше через задачи.
      { tasks: { some: { status: "PENDING", type: { in: ["CALL", "FOLLOW_UP"] }, dueAt: { lte: todayEnd } } } },
    ],
  };
}

export async function getCallQueue(ownerId: string, isDirector: boolean): Promise<QueueItem[]> {
  const todayStart = startOfDay(new Date());
  const leads = await prisma.lead.findMany({
    where: queueWhere(ownerId, isDirector),
    include: {
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true, phone: true } },
      activities: {
        where: { type: "CALL" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { comment: true, createdAt: true },
      },
    },
    take: 200,
  });

  const items = leads.map((l) => ({
    id: l.id,
    companyName: l.company.name,
    contactName: l.contact ? `${l.contact.firstName} ${l.contact.lastName ?? ""}`.trim() || null : null,
    phone: l.contact?.phone ?? null,
    status: l.status,
    nextContactAt: l.nextContactAt?.toISOString() ?? null,
    lastCall: l.activities[0]
      ? { comment: l.activities[0].comment, createdAt: l.activities[0].createdAt.toISOString() }
      : null,
    overdue: Boolean(l.nextContactAt && l.nextContactAt < todayStart),
    fresh: l.contactAttempts === 0,
  }));

  // Сначала просроченные и назначенные на время, потом новые — по дате добавления.
  return items.sort((a, b) => {
    if (a.nextContactAt && b.nextContactAt) return a.nextContactAt.localeCompare(b.nextContactAt);
    if (a.nextContactAt) return -1;
    if (b.nextContactAt) return 1;
    return 0;
  });
}
