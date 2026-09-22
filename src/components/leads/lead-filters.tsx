"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { LEAD_STATUS_LABELS, PRIORITY_LABELS, LEAD_SOURCE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface Owner {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_OPTIONS = Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
const SOURCE_OPTIONS = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }));

export function LeadFilters({
  owners,
  hideStatus,
}: {
  owners: Owner[];
  hideStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleParam(key: string) {
    setParam(key, searchParams.get(key) === "1" ? "" : "1");
  }

  const activeKeys = Array.from(searchParams.keys()).filter((k) => k !== "q");
  const hasFilters = activeKeys.length > 0;
  const ownerOptions = owners.map((o) => ({ value: o.id, label: `${o.firstName} ${o.lastName}` }));

  return (
    <>
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {!hideStatus && (
          <FilterSelect
            label="Статус"
            value={searchParams.get("status") ?? ""}
            options={STATUS_OPTIONS}
            onChange={(v) => setParam("status", v)}
          />
        )}
        <FilterSelect
          label="Приоритет"
          value={searchParams.get("priority") ?? ""}
          options={PRIORITY_OPTIONS}
          onChange={(v) => setParam("priority", v)}
        />
        <FilterSelect
          label="Ответственный"
          value={searchParams.get("ownerId") ?? ""}
          options={ownerOptions}
          onChange={(v) => setParam("ownerId", v)}
        />
        <FilterSelect
          label="Источник"
          value={searchParams.get("source") ?? ""}
          options={SOURCE_OPTIONS}
          onChange={(v) => setParam("source", v)}
        />

        <span className="mx-0.5 h-5 w-px bg-border-default" />

        <button
          type="button"
          onClick={() => toggleParam("dueToday")}
          className={cn(
            "h-8 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
            searchParams.get("dueToday") === "1"
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-border-default bg-white text-text-secondary hover:bg-surface-hover"
          )}
        >
          Контакт сегодня
        </button>
        <button
          type="button"
          onClick={() => toggleParam("noWebsite")}
          className={cn(
            "h-8 rounded-md border px-2.5 text-[13px] font-medium transition-colors",
            searchParams.get("noWebsite") === "1"
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-border-default bg-white text-text-secondary hover:bg-surface-hover"
          )}
        >
          Без сайта
        </button>

        {hasFilters && (
          <Button variant="ghost" size="sm" icon={<X />} onClick={() => router.push(pathname)}>
            Сбросить
          </Button>
        )}
      </div>

      <div className="flex w-full items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-2 rounded-md border px-3.5 text-[13px] font-medium transition-colors",
            hasFilters
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-border-default bg-white text-text-secondary"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
          {hasFilters && (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white">
              {activeKeys.length}
            </span>
          )}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="flex h-10 shrink-0 items-center gap-1 rounded-md px-2.5 text-[13px] font-medium text-text-secondary"
          >
            <X className="h-4 w-4" />
            Сбросить
          </button>
        )}
      </div>

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Фильтры" size="sm">
        <div className="space-y-4">
          {!hideStatus && (
            <Select
              label="Статус"
              value={searchParams.get("status") ?? ""}
              onChange={(e) => setParam("status", e.target.value)}
              placeholder="Любой статус"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Приоритет"
            value={searchParams.get("priority") ?? ""}
            onChange={(e) => setParam("priority", e.target.value)}
            placeholder="Любой приоритет"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Ответственный"
            value={searchParams.get("ownerId") ?? ""}
            onChange={(e) => setParam("ownerId", e.target.value)}
            placeholder="Любой"
          >
            {ownerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Источник"
            value={searchParams.get("source") ?? ""}
            onChange={(e) => setParam("source", e.target.value)}
            placeholder="Любой источник"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <div className="space-y-2 border-t border-border-subtle pt-4">
            <label className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-text-primary">Контакт сегодня</span>
              <input
                type="checkbox"
                checked={searchParams.get("dueToday") === "1"}
                onChange={() => toggleParam("dueToday")}
                className="h-5 w-5 accent-primary-600"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-text-primary">Без сайта</span>
              <input
                type="checkbox"
                checked={searchParams.get("noWebsite") === "1"}
                onChange={() => toggleParam("noWebsite")}
                className="h-5 w-5 accent-primary-600"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {hasFilters && (
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => router.push(pathname)}>
              Сбросить
            </Button>
          )}
          <Button variant="primary" className="flex-1 justify-center" onClick={() => setSheetOpen(false)}>
            Готово
          </Button>
        </div>
      </Modal>
    </>
  );
}
