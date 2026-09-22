import type { CurrentUser } from "@/lib/auth/current-user";
import type { Prisma } from "@/generated/prisma/client";

export function ownLeadsFilter(user: CurrentUser): Prisma.LeadWhereInput {
  return user.role === "DIRECTOR" ? {} : { ownerId: user.id };
}

export function ownTasksFilter(user: CurrentUser): Prisma.TaskWhereInput {
  return user.role === "DIRECTOR" ? {} : { assigneeId: user.id };
}
