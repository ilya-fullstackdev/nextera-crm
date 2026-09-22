import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import type { Role, UserStatus } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  role: Role;
  status: UserStatus;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      role: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt || user.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    role: user.role,
    status: user.status,
  };
});

export function fullName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`;
}
