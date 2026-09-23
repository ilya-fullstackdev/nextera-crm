import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { canViewLeads, canManageEmployees } from "@/lib/permissions";
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

/** Страницы с лидами и клиентской базой — закрыты для отдела кадров. */
export async function requireLeadsAccess(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!canViewLeads(user.role)) {
    redirect("/crm");
  }
  return user;
}

/** Раздел «Сотрудники» — руководитель и отдел кадров. */
export async function requireEmployeesAccess(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) {
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

export async function requireApiLeadsAccess(): Promise<CurrentUser> {
  const user = await requireApiUser();
  if (!canViewLeads(user.role)) {
    throw new ApiAuthError(403, "Недостаточно прав");
  }
  return user;
}

export async function requireApiEmployeesAccess(): Promise<CurrentUser> {
  const user = await requireApiUser();
  if (!canManageEmployees(user.role)) {
    throw new ApiAuthError(403, "Недостаточно прав");
  }
  return user;
}
