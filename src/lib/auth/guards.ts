import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import type { Role } from "@/generated/prisma/enums";

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/crm");
  }
  return user;
}

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiAuthError(401, "Не авторизован");
  }
  return user;
}

export async function requireApiRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireApiUser();
  if (!roles.includes(user.role)) {
    throw new ApiAuthError(403, "Недостаточно прав");
  }
  return user;
}
