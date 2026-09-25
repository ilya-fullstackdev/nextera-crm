import type { Role } from "@/generated/prisma/enums";
import {
  PhoneCall,
  Users2,
  CheckSquare,
  KanbanSquare,
  UserCog,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export { ROLE_LABELS } from "@/lib/labels";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Подсказка при наведении: что внутри раздела. */
  hint: string;
}

/**
 * Меню — только то, чем пользуются каждый день. Переданные, отказы, сделки
 * и переговоры — вкладки в «Лидах»; компании и контакты живут в карточке лида.
 */
export function getNavItems(role: Role): NavItem[] {
  const calls: NavItem = {
    label: "Звонки",
    href: "/crm",
    icon: PhoneCall,
    hint: "Кому звонить сегодня. Начните день отсюда",
  };
  const leads: NavItem = {
    label: role === "DIRECTOR" ? "Лиды" : "Мои лиды",
    href: "/crm/leads",
    icon: Users2,
    hint: "Все клиенты: в работе, у руководителя, сделки и отказы",
  };
  const employees: NavItem = {
    label: "Сотрудники",
    href: "/crm/employees",
    icon: UserCog,
    hint: "Наём и учётные записи сотрудников",
  };

  // Отдел кадров занимается только наймом — лиды и клиентская база ему не нужны.
  if (role === "HR") {
    return [
      { label: "Главная", href: "/crm", icon: LayoutDashboard, hint: "Сводка по найму" },
      employees,
      { label: "Задачи", href: "/crm/tasks", icon: CheckSquare, hint: "Ваши напоминания" },
    ];
  }

  if (role === "OPERATOR") return [calls, leads];
  // Совмещённая должность дополнительно ведёт найм в отдел холодных звонков.
  if (role === "HR_OPERATOR") return [calls, leads, employees];

  return [
    calls,
    leads,
    { label: "Воронка", href: "/crm/pipeline", icon: KanbanSquare, hint: "Все лиды по пяти этапам — от обзвона до сделки. Карточки можно перетаскивать" },
    { label: "Выплаты", href: "/crm/payouts", icon: Wallet, hint: "Проценты сотрудникам с закрытых сделок" },
    { label: "Расходы", href: "/crm/expenses", icon: Receipt, hint: "Хостинг, домены и другие регулярные расходы" },
    employees,
    { label: "Отчёты", href: "/crm/reports", icon: BarChart3, hint: "Статистика по звонкам, лидам и сделкам" },
    { label: "Журнал", href: "/crm/logs", icon: ScrollText, hint: "Кто и что менял в системе" },
  ];
}
