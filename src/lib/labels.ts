import type {
  ExpenseType,
  LeadStatus,
  Priority,
  LeadSource,
  ActivityType,
  TaskType,
  TaskStatus,
  NeedLevel,
  DecisionMakerStatus,
  DealTimeline,
  BudgetStatus,
  InterestLevel,
  RejectionReason,
  Role,
  UserStatus,
} from "@/generated/prisma/enums";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Новый лид",
  SEARCHING_DM: "Поиск ЛПР",
  FIRST_CONTACT: "Первый контакт",
  DM_FOUND: "ЛПР найден",
  QUALIFICATION: "Квалификация",
  HANDED_TO_MANAGER: "Передан руководителю",
  NEGOTIATION: "Переговоры",
  PROPOSAL_SENT: "КП отправлено",
  DEAL: "Сделка",
  REJECTED: "Отказ",
  CALLBACK_LATER: "Перезвонить позже",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "SEARCHING_DM",
  "FIRST_CONTACT",
  "DM_FOUND",
  "QUALIFICATION",
  "HANDED_TO_MANAGER",
  "NEGOTIATION",
  "PROPOSAL_SENT",
  "DEAL",
  "REJECTED",
  "CALLBACK_LATER",
];

export const LEAD_STATUS_TONE: Record<LeadStatus, "neutral" | "primary" | "success" | "warning" | "danger" | "info"> = {
  NEW: "neutral",
  SEARCHING_DM: "info",
  FIRST_CONTACT: "info",
  DM_FOUND: "primary",
  QUALIFICATION: "primary",
  HANDED_TO_MANAGER: "warning",
  NEGOTIATION: "warning",
  PROPOSAL_SENT: "warning",
  DEAL: "success",
  REJECTED: "danger",
  CALLBACK_LATER: "neutral",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
};

export const PRIORITY_TONE: Record<Priority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  YANDEX_MAPS: "Яндекс Карты",
  GOOGLE_MAPS: "Google Maps",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  TELEGRAM: "Telegram",
  WEBSITE: "Сайт",
  REFERRAL: "Рекомендация",
  MANUAL_SEARCH: "Ручной поиск",
  OTHER: "Другое",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Звонок",
  MESSAGE: "Сообщение",
  EMAIL: "Email",
  MEETING: "Встреча",
  NOTE: "Заметка",
  STATUS_CHANGE: "Изменение статуса",
  HANDOVER: "Передача лида",
  FILE: "Файл",
  REJECTION: "Отказ",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: "Звонок",
  MEETING: "Встреча",
  EMAIL: "Email",
  FOLLOW_UP: "Повторный контакт",
  OTHER: "Другое",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "В работе",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
};

export const NEED_LEVEL_LABELS: Record<NeedLevel, string> = {
  NONE: "Нет",
  POTENTIAL: "Потенциальная",
  CONFIRMED: "Есть",
};

export const DM_STATUS_LABELS: Record<DecisionMakerStatus, string> = {
  NOT_FOUND: "Не найден",
  FOUND: "Найден",
  PARTICIPATES: "Участвует в принятии решения",
  MULTIPLE: "Решение принимает несколько человек",
};

export const TIMELINE_LABELS: Record<DealTimeline, string> = {
  NOW: "Сейчас",
  ONE_TO_THREE_MONTHS: "1-3 месяца",
  THREE_TO_SIX_MONTHS: "3-6 месяцев",
  UNDEFINED: "Не определён",
};

export const BUDGET_LABELS: Record<BudgetStatus, string> = {
  UNKNOWN: "Не известен",
  ESTIMATE: "Есть ориентир",
  DEFINED: "Определён",
  NONE: "Бюджета нет",
};

export const INTEREST_LABELS: Record<InterestLevel, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
};

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  NO_NEED: "Не нужен сайт",
  HAS_CONTRACTOR: "Уже есть подрядчик",
  RECENT_WEBSITE: "Недавно сделали сайт",
  RECENT_REDESIGN: "Недавно сделали редизайн",
  EXPENSIVE: "Дорого",
  NO_BUDGET: "Нет бюджета",
  NOT_NOW: "Не сейчас",
  CHOSE_OTHER: "Выбрали другого подрядчика",
  CANT_REACH_DM: "Не удалось выйти на ЛПР",
  OTHER: "Другое",
};

export const ROLE_LABELS: Record<Role, string> = {
  OPERATOR: "Оператор",
  DIRECTOR: "Руководитель",
  HR: "Отдел кадров",
  HR_OPERATOR: "Кадры + холодные звонки",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OPERATOR: "Холодные звонки: свои лиды, задачи и передача лида руководителю",
  DIRECTOR: "Полный доступ, отчёты и журнал аудита",
  HR: "Наём в отдел холодных звонков. Лиды и клиентов не видит",
  HR_OPERATOR: "Холодные звонки и наём сотрудников одновременно",
};

export const ROLE_TONE: Record<Role, "neutral" | "primary" | "success" | "warning" | "info"> = {
  OPERATOR: "info",
  DIRECTOR: "warning",
  HR: "success",
  HR_OPERATOR: "neutral",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Активен",
  BLOCKED: "Заблокирован",
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  HOSTING: "Хостинг",
  DOMAIN: "Домен",
  SSL: "SSL-сертификат",
  EMAIL: "Почта",
  SERVICE: "Сервис",
  OTHER: "Другое",
};
