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
  BarChart3,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function getNavItems(role: Role): NavItem[] {
  const home: NavItem = { label: "Главная", href: "/crm", icon: LayoutDashboard };
  const tasks: NavItem = { label: role === "OPERATOR" ? "Мои задачи" : "Задачи", href: "/crm/tasks", icon: CheckSquare };
  const pipeline: NavItem = { label: "Воронка", href: "/crm/pipeline", icon: KanbanSquare };
  const companies: NavItem = { label: "Компании", href: "/crm/companies", icon: Building2 };
  const contacts: NavItem = { label: "Контакты", href: "/crm/contacts", icon: Contact2 };
  const rejected: NavItem = { label: "Отказы", href: "/crm/rejected", icon: XCircle };

  if (role === "OPERATOR") {
    return [
      home,
      { label: "Лиды", href: "/crm/leads", icon: Users2 },
      tasks,
      pipeline,
      companies,
      contacts,
      { label: "Переданные менеджеру", href: "/crm/handed-over", icon: Send },
      rejected,
    ];
  }

  if (role === "MANAGER") {
    return [
      home,
      { label: "Мои лиды", href: "/crm/leads", icon: Users2 },
      tasks,
      pipeline,
      companies,
      contacts,
      { label: "Переговоры", href: "/crm/negotiations", icon: Handshake },
      { label: "Сделки", href: "/crm/deals", icon: FileText },
      rejected,
    ];
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
    { label: "Сотрудники", href: "/crm/employees", icon: UserCog },
    { label: "Отчёты", href: "/crm/reports", icon: BarChart3 },
    { label: "Логи", href: "/crm/logs", icon: ScrollText },
  ];
}

export const ROLE_LABELS: Record<Role, string> = {
  OPERATOR: "Оператор",
  MANAGER: "Менеджер",
  DIRECTOR: "Руководитель",
};
