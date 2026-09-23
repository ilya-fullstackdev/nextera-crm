const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: "создал сотрудника",
  UPDATE_USER: "изменил данные сотрудника",
  UPDATE_ROLE: "изменил роль сотрудника",
  BLOCK_USER: "заблокировал сотрудника",
  ACTIVATE_USER: "активировал сотрудника",
  RESET_PASSWORD: "сбросил пароль сотрудника",
  DELETE_USER: "удалил сотрудника",
  REASSIGN_ON_DELETE: "переназначил лиды и задачи при удалении сотрудника",
  CREATE_LEAD: "создал лид",
  DELETE_LEAD: "удалил лид",
  UPDATE_COMPANY: "изменил компанию",
  DELETE_COMPANY: "удалил компанию",
  UPDATE_CONTACT: "изменил контакт",
  DELETE_CONTACT: "удалил контакт",
  UPDATE_LEAD_STATUS: "изменил статус лида",
  HANDOVER_LEAD: "передал лид",
  REJECT_LEAD: "перевёл лид в отказ",
  CLOSE_DEAL: "закрыл сделку",
  UPDATE_PAYOUT_RATES: "изменил проценты выплат",
  UPDATE_DEAL: "изменил сумму сделки",
  PAY_PAYOUT: "отметил выплату",
  UNPAY_PAYOUT: "отменил отметку о выплате",
  CREATE_EXPENSE: "добавил расход по проекту",
  UPDATE_EXPENSE: "изменил расход по проекту",
  DELETE_EXPENSE: "удалил расход по проекту",
};

export function describeAuditLog(entry: {
  action: string;
  oldValue: unknown;
  newValue: unknown;
}) {
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  const oldV = entry.oldValue as Record<string, unknown> | null;
  const newV = entry.newValue as Record<string, unknown> | null;

  if (entry.action === "UPDATE_ROLE" && oldV?.role && newV?.role) {
    return `${label} с «${oldV.role}» на «${newV.role}»`;
  }
  if (newV && "firstName" in newV) {
    return `${label} (${newV.firstName} ${newV.lastName ?? ""})`.trim();
  }
  if (newV && "company" in newV) {
    return `${label}: ${newV.company}`;
  }
  if (newV && "deal" in newV) {
    return `${label}: ${newV.deal}`;
  }
  if (newV && "payout" in newV) {
    return `${label}: ${newV.payout}`;
  }
  if (newV && "expense" in newV) {
    return `${label}: ${newV.expense}`;
  }
  if (newV && "rates" in newV) {
    return `${label} (${newV.rates})`;
  }
  if (newV && "toUser" in newV) {
    return `${label}: ${newV.toUser}`;
  }
  if (newV && "reason" in newV) {
    return `${label}: ${newV.reason}`;
  }
  if (newV && "status" in newV) {
    return `${label}: ${newV.status}`;
  }
  return label;
}
