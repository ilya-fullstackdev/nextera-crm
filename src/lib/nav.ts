import type { Role } from "@/generated/prisma/enums";
import {
  LayoutDashboard,
  Users2,
  CheckSquare,
  KanbanSquare,
  Building2,
  Contact2,
  Send,
  XCircle,
  Handshake,
  FileText,
  UserCog,
  Wallet,
  Receipt,
  BarChart3,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export { ROLE_LABELS } from "@/lib/labels";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function getNavItems(role: Role): NavItem[] {
  const home: NavItem = { label: "Главная", href: "/crm", icon: LayoutDashboard };
  const tasks: NavItem = {
    label: role === "OPERATOR" || role === "HR_OPERATOR" ? "Мои задачи" : "Задачи",
    href: "/crm/tasks",
    icon: CheckSquare,
  };
  const pipeline: NavItem = { label: "Воронка", href: "/crm/pipeline", icon: KanbanSquare };
  const companies: NavItem = { label: "Компании", href: "/crm/companies", icon: Building2 };
  const contacts: NavItem = { label: "Контакты", href: "/crm/contacts", icon: Contact2 };
  const rejected: NavItem = { label: "Отказы", href: "/crm/rejected", icon: XCircle };
  const employees: NavItem = { label: "Сотрудники", href: "/crm/employees", icon: UserCog };

  // Отдел кадров занимается только наймом — лиды и клиентская база ему не нужны.
  if (role === "HR") {
    return [home, employees, tasks];
  }

  if (role === "OPERATOR" || role === "HR_OPERATOR") {
    const items = [
      home,
      { label: "Лиды", href: "/crm/leads", icon: Users2 },
      tasks,
      pipeline,
      companies,
      contacts,
      { label: "Переданные", href: "/crm/handed-over", icon: Send },
      rejected,
    ];
    // Совмещённая должность дополнительно ведёт найм в отдел холодных звонков.
    return role === "HR_OPERATOR" ? [...items, employees] : items;
  }

  return [
    home,
    { label: "Лиды", href: "/crm/leads", icon: Users2 },
    tasks,
    pipeline,
    companies,
    contacts,
    { label: "Переговоры", href: "/crm/negotiations", icon: Handshake },
    { label: "Сделки", href: "/crm/deals", icon: FileText },
    rejected,
    { label: "Выплаты", href: "/crm/payouts", icon: Wallet },
    { label: "Расходы", href: "/crm/expenses", icon: Receipt },
    employees,
    { label: "Отчёты", href: "/crm/reports", icon: BarChart3 },
    { label: "Логи", href: "/crm/logs", icon: ScrollText },
  ];
}
