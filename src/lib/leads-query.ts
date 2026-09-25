import type { Prisma, LeadStatus } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/current-user";

export interface LeadsSearchParams {
  q?: string;
  view?: string;
  ownerId?: string;
  /** «1» — только лиды, которые добавил сам пользователь. */
  mine?: string;
  companyId?: string;
  page?: string;
}

export const PAGE_SIZE = 20;

const AT_MANAGER: LeadStatus[] = ["HANDED_TO_MANAGER", "NEGOTIATION", "PROPOSAL_SENT"];

/**
 * Вкладки списка лидов. Вместо отдельных страниц «Переданные», «Отказы»,
 * «Сделки», «Переговоры» и десятка фильтров — один список с понятными вкладками.
 */
export const LEAD_VIEWS = [
  { value: "active", label: "В работе", hint: "Лиды, с которыми вы сейчас работаете" },
  { value: "manager", label: "У руководителя", hint: "Переданные руководителю: он ведёт переговоры" },
  { value: "deals", label: "Сделки", hint: "Клиенты, которые заплатили" },
  { value: "rejected", label: "Отказы", hint: "Клиенты, которые отказались. Можно вернуться к ним позже" },
  { value: "all", label: "Все", hint: "Все лиды без разбора" },
] as const;

export type LeadView = (typeof LEAD_VIEWS)[number]["value"];

export function parseView(value: string | undefined): LeadView {
  return LEAD_VIEWS.some((v) => v.value === value) ? (value as LeadView) : "active";
}

/** Оператор видит свои лиды и те, что сам передал руководителю. */
function scopeFor(user: CurrentUser): Prisma.LeadWhereInput {
  if (user.role === "DIRECTOR") return {};
  return { OR: [{ ownerId: user.id }, { handovers: { some: { fromUserId: user.id } } }] };
}

function viewFilter(view: LeadView): Prisma.LeadWhereInput {
  switch (view) {
    case "active":
      return { status: { notIn: ["REJECTED", "DEAL", ...AT_MANAGER] } };
    case "manager":
      return { status: { in: AT_MANAGER } };
    case "deals":
      return { status: "DEAL" };
    case "rejected":
      return { status: "REJECTED" };
    default:
      return {};
  }
}

export function buildLeadsWhere(
  user: CurrentUser,
  params: LeadsSearchParams,
  view: LeadView = parseView(params.view)
): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [scopeFor(user), viewFilter(view)];

  // В «В работе» оператор видит только свои — переданные уже не его забота.
  if (user.role !== "DIRECTOR" && view === "active") {
    and.push({ ownerId: user.id });
  }
  if (params.ownerId) and.push({ ownerId: params.ownerId });
  if (params.mine === "1") and.push({ createdById: user.id });
  if (params.companyId) and.push({ companyId: params.companyId });

  if (params.q) {
    const q = params.q;
    and.push({
      OR: [
        { company: { name: { contains: q, mode: "insensitive" } } },
        { company: { website: { contains: q, mode: "insensitive" } } },
        { contact: { firstName: { contains: q, mode: "insensitive" } } },
        { contact: { lastName: { contains: q, mode: "insensitive" } } },
        { contact: { phone: { contains: q, mode: "insensitive" } } },
        { contact: { telegram: { contains: q, mode: "insensitive" } } },
        { contact: { email: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  return { AND: and };
}
