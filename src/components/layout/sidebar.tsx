"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";
import { getNavItems, type NavItem } from "@/lib/nav";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import logo from "@/img/logo.png";
import { useMobileSidebar } from "@/components/layout/sidebar-context";

const STORAGE_KEY = "nextera-sidebar-collapsed";

export function Sidebar({
  user,
}: {
  user: { firstName: string; lastName: string; role: Role };
}) {
  const pathname = usePathname();
  const items = getNavItems(user.role);
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, closeMobile } = useMobileSidebar();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
    }
  }, []);

  useEffect(() => {
    closeMobile();
  }, [pathname]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
      }
      return next;
    });
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/crm" && pathname.startsWith(href));
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-surface-sidebar transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-14" : "md:w-60"
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle", collapsed ? "px-5 md:justify-center md:px-2" : "px-5")}>
          {(!collapsed || mobileOpen) && (
            <>
              <Image src={logo} alt="Nextera CRM" width={28} height={28} className="h-7 w-7 shrink-0 rounded-md object-contain" priority />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">Nextera CRM</span>
            </>
          )}
          <button
            onClick={toggle}
            title={collapsed ? "Показать меню" : "Скрыть меню"}
            className="hidden shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary md:block"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={closeMobile}
            title="Закрыть меню"
            className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className={cn("flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-4", !collapsed && "md:px-3", collapsed && "md:px-2")}>
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed && !mobileOpen} />
          ))}
        </nav>

        <div className={cn("border-t border-border-subtle p-3", collapsed && "md:p-2")}>
          <UserMenu user={user} variant="block" align="left" hideLabel={collapsed && !mobileOpen} showProfileActions={false} />
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? `${item.label} — ${item.hint}` : item.hint}
      className={cn(
        "flex items-center gap-2.5 rounded-md py-2 text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5",
        active
          ? "bg-primary-50 text-primary-700"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
    >
      <Icon className="h-4.25 w-4.25 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
