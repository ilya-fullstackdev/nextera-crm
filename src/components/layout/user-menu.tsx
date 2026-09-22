"use client";

import { useRouter } from "next/navigation";
import { LogOut, KeyRound, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { ROLE_LABELS } from "@/lib/nav";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function UserMenu({
  user,
  variant = "compact",
  align = "right",
  hideLabel = false,
  showProfileActions = true,
}: {
  user: { firstName: string; lastName: string; role: Role };
  variant?: "compact" | "block";
  align?: "left" | "right";
  hideLabel?: boolean;
  showProfileActions?: boolean;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Dropdown
      align={align}
      trigger={
        <button
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover",
            variant === "block" && "w-full py-2",
            hideLabel && "justify-center px-0"
          )}
        >
          <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
          {!hideLabel && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-text-primary">
                {user.firstName} {user.lastName}
              </span>
              <span className="block truncate text-[11px] text-text-tertiary">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          )}
        </button>
      }
      items={[
        ...(showProfileActions
          ? [
              { label: "Мой профиль", icon: <UserRound />, onClick: () => router.push("/crm/profile") },
              { label: "Изменить пароль", icon: <KeyRound />, onClick: () => router.push("/crm/profile?action=password") },
            ]
          : []),
        { label: "Выйти", icon: <LogOut />, onClick: handleLogout, danger: true },
      ]}
    />
  );
}
