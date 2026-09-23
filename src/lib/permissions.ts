import type { Role } from "@/generated/prisma/enums";

/**
 * Единая точка правды по правам ролей.
 *
 * OPERATOR      — отдел холодных звонков: свои лиды и задачи.
 * DIRECTOR      — видит всё, управляет сотрудниками, отчёты и логи.
 * HR            — отдел кадров: нанимает людей в отдел холодных звонков.
 *                 Лиды и клиентскую базу не видит вообще.
 * HR_OPERATOR   — совмещает отдел кадров и холодные звонки: свои лиды + найм.
 */

/** Роли, которые работают с лидами и клиентской базой. */
export function canViewLeads(role: Role) {
  return role !== "HR";
}

/** Роли, которые нанимают сотрудников в отдел холодных звонков. */
export function canManageEmployees(role: Role) {
  return role === "DIRECTOR" || role === "HR" || role === "HR_OPERATOR";
}

/** Отчёты, журнал аудита и прочая аналитика по компании. */
export function canViewReports(role: Role) {
  return role === "DIRECTOR";
}

/** Кадровик может заводить только людей в отдел холодных звонков. */
export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "DIRECTOR") {
    return ["OPERATOR", "DIRECTOR", "HR", "HR_OPERATOR"];
  }
  if (canManageEmployees(actorRole)) {
    return ["OPERATOR", "HR_OPERATOR"];
  }
  return [];
}

/** Можно ли актору заводить/менять сотрудника с такой ролью. */
export function canManageRole(actorRole: Role, targetRole: Role) {
  return assignableRoles(actorRole).includes(targetRole);
}

/** Кому можно передать лид. Менеджеров в структуре нет — лид уходит руководителю. */
export const HANDOVER_ROLES: Role[] = ["DIRECTOR"];

export function canReceiveHandover(role: Role) {
  return HANDOVER_ROLES.includes(role);
}

/** Сотрудники отдела холодных звонков (для статистики найма). */
export const COLD_CALL_ROLES: Role[] = ["OPERATOR", "HR_OPERATOR"];
