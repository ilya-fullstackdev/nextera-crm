"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { UserCheck } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { Tooltip } from "@/components/ui/tooltip";
import { SearchBox } from "@/components/shared/search-box";
import { NewLeadButton } from "@/components/leads/new-lead-button";
import { LEAD_VIEWS, type LeadView } from "@/lib/leads-query";
import { cn } from "@/lib/utils";

interface Owner {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Всё управление списком лидов в одном ряду: поиск, вкладки, фильтры
 * и кнопка нового лида. На узких экранах вкладки прокручиваются вбок.
 */
export function LeadsToolbar({
  view,
  counts,
  owners,
}: {
  view: LeadView;
  counts: Record<string, number>;
  owners: Owner[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mine = searchParams.get("mine") === "1";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const chip = (active: boolean) =>
    cn(
      "flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[13px] font-medium transition-colors",
      active
        ? "border-primary-600 bg-primary-600 text-white"
        : "border-border-default bg-white text-text-secondary hover:bg-surface-hover hover:text-text-primary"
    );

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="lg:w-36 lg:shrink-0 2xl:w-56">
        <SearchBox placeholder="Поиск по имени, телефону" />
      </div>

      <div className="-mx-4 flex min-w-0 items-center gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-1 lg:px-0 lg:pb-0">
        {LEAD_VIEWS.map((v) => (
          <Tooltip key={v.value} content={v.hint} side="bottom" className="shrink-0">
            <button
              type="button"
              onClick={() => setParam("view", v.value === "active" ? "" : v.value)}
              className={chip(v.value === view)}
            >
              {v.label}
              <span className={cn("text-[12px]", v.value === view ? "text-white/80" : "text-text-tertiary")}>
                {counts[v.value] ?? 0}
              </span>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Выпадающий список нельзя класть в прокручиваемый ряд — он там обрежется. */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Tooltip content="Показать только тех клиентов, которых добавили вы" side="bottom" className="shrink-0">
          <button type="button" aria-pressed={mine} onClick={() => setParam("mine", mine ? "" : "1")} className={chip(mine)}>
            <UserCheck className="h-3.5 w-3.5" />
            Добавлены мной
          </button>
        </Tooltip>

        {owners.length > 0 && (
          <div className="shrink-0">
            <FilterSelect
              label="Сотрудник"
              value={searchParams.get("ownerId") ?? ""}
              options={owners.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` }))}
              onChange={(v) => setParam("ownerId", v)}
            />
          </div>
        )}
        <div className="ml-auto lg:ml-1.5">
          <NewLeadButton withFab shortLabel="Лид" />
        </div>
      </div>
    </div>
  );
}
