import type { Prisma, LeadStatus, Priority, LeadSource } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/current-user";
import { ownLeadsFilter } from "@/lib/scope";

export interface LeadsSearchParams {
  q?: string;
  status?: string;
  priority?: string;
  ownerId?: string;
  source?: string;
  companyId?: string;
  from?: string;
  to?: string;
  page?: string;
  noWebsite?: string;
  dueToday?: string;
}

export const PAGE_SIZE = 20;

export function buildLeadsWhere(
  user: CurrentUser,
  params: LeadsSearchParams,
  baseStatuses?: LeadStatus[],
  ownerScope: "owner" | "handedFrom" = "owner"
): Prisma.LeadWhereInput {
  const scopeFilter: Prisma.LeadWhereInput =
    ownerScope === "handedFrom"
      ? user.role === "DIRECTOR"
        ? {}
        : { handovers: { some: { fromUserId: user.id } } }
      : ownLeadsFilter(user);

  const where: Prisma.LeadWhereInput = { ...scopeFilter };

  if (baseStatuses) {
    where.status = { in: baseStatuses };
  } else if (params.status) {
    where.status = params.status as LeadStatus;
  }

  if (params.priority) {
    where.priority = params.priority as Priority;
  }
  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }
  if (params.source) {
    where.source = params.source as LeadSource;
  }
  if (params.companyId) {
    where.companyId = params.companyId;
  }
  if (params.noWebsite === "1") {
    where.company = { is: { OR: [{ website: null }, { website: "" }] } };
  }
  if (params.dueToday === "1") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    where.nextContactAt = { gte: start, lte: end };
  } else if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to + "T23:59:59") } : {}),
    };
  }

  if (params.q) {
    where.AND = [
      {
        OR: [
          { company: { name: { contains: params.q, mode: "insensitive" } } },
          { company: { website: { contains: params.q, mode: "insensitive" } } },
          { contact: { firstName: { contains: params.q, mode: "insensitive" } } },
          { contact: { lastName: { contains: params.q, mode: "insensitive" } } },
          { contact: { phone: { contains: params.q, mode: "insensitive" } } },
          { contact: { telegram: { contains: params.q, mode: "insensitive" } } },
          { contact: { email: { contains: params.q, mode: "insensitive" } } },
        ],
      },
    ];
  }

  return where;
}
