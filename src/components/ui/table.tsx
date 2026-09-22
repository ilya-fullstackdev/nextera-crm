"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ContextMenuPortal, useContextMenu, type ContextMenuItem } from "@/components/ui/context-menu";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  loading,
  contextMenuItems,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  loading?: boolean;
  contextMenuItems?: (row: T) => ContextMenuItem[];
}) {
  const { position, open, close } = useContextMenu();
  const [activeRow, setActiveRow] = useState<T | null>(null);

  function handleContextMenu(e: React.MouseEvent, row: T) {
    if (!contextMenuItems) return;
    const items = contextMenuItems(row);
    if (items.length === 0) return;
    setActiveRow(row);
    open(e, items.length);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border-subtle">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="animate-skeleton h-4 w-full max-w-[140px] rounded bg-neutral-150" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  onContextMenu={(e) => handleContextMenu(e, row)}
                  className={cn(
                    "border-b border-border-subtle last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-surface-hover"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 align-middle text-[13px] text-text-primary", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <div className="py-12">{emptyState}</div>
      )}
      {contextMenuItems && (
        <ContextMenuPortal position={position} items={activeRow ? contextMenuItems(activeRow) : []} onClose={close} />
      )}
    </div>
  );
}
