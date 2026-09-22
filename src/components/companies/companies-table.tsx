"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDeleteModal } from "@/components/shared/confirm-delete-modal";
import { EditCompanyModal } from "@/components/companies/edit-company-modal";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/generated/prisma/enums";

interface CompanyRow {
  id: string;
  name: string;
  niche: string | null;
  city: string | null;
  website: string | null;
  _count: { contacts: number; leads: number };
}

export function CompaniesTable({ companies, currentUserRole }: { companies: CompanyRow[]; currentUserRole?: Role }) {
  const router = useRouter();
  const toast = useToast();
  const [editTarget, setEditTarget] = useState<CompanyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/companies/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Не удалось удалить компанию", data.error);
      return;
    }
    toast.success("Компания удалена", deleteTarget.name);
    setDeleteTarget(null);
    router.refresh();
  }

  const columns: Column<CompanyRow>[] = [
    { key: "name", header: "Компания", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "niche", header: "Ниша", render: (c) => c.niche ?? "—" },
    { key: "city", header: "Город", render: (c) => c.city ?? "—" },
    {
      key: "website",
      header: "Сайт",
      render: (c) =>
        c.website ? (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 hover:underline"
          >
            {c.website}
          </a>
        ) : (
          "—"
        ),
    },
    { key: "contacts", header: "Контакты", render: (c) => c._count.contacts },
    { key: "leads", header: "Лиды", render: (c) => c._count.leads },
  ];

  function buildContextMenu(company: CompanyRow): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      { label: "Открыть лиды", icon: <ExternalLink />, onClick: () => router.push(`/crm/leads?companyId=${company.id}`) },
      { label: "Редактировать", icon: <Pencil />, onClick: () => setEditTarget(company) },
    ];
    if (currentUserRole === "DIRECTOR") {
      items.push({
        label: "Удалить компанию",
        icon: <Trash2 />,
        danger: true,
        onClick: () => setDeleteTarget(company),
      });
    }
    return items;
  }

  const emptyState = <EmptyState icon={<Building2 />} title="Компании не найдены" />;

  return (
    <>
      <div className="hidden md:block">
        <Table
          columns={columns}
          rows={companies}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/crm/leads?companyId=${c.id}`)}
          contextMenuItems={buildContextMenu}
          emptyState={emptyState}
        />
      </div>

      <div className="space-y-2.5 md:hidden">
        {companies.length === 0
          ? <div className="py-12">{emptyState}</div>
          : companies.map((company) => (
              <div
                key={company.id}
                onClick={() => router.push(`/crm/leads?companyId=${company.id}`)}
                className="rounded-lg border border-border-subtle bg-white p-4 active:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-text-primary">{company.name}</p>
                    <p className="truncate text-[13px] text-text-secondary">
                      {[company.niche, company.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      trigger={
                        <button className="-m-2 rounded-md p-2 text-text-tertiary hover:bg-surface-hover hover:text-text-primary">
                          <MoreVertical className="h-4.5 w-4.5" />
                        </button>
                      }
                      items={buildContextMenu(company)}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                  <span className="text-[12px] text-text-tertiary">
                    {company._count.contacts} контактов · {company._count.leads} лидов
                  </span>
                  {company.website && (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="truncate text-[13px] text-primary-600"
                    >
                      {company.website}
                    </a>
                  )}
                </div>
              </div>
            ))}
      </div>

      <EditCompanyModal company={editTarget} onClose={() => setEditTarget(null)} />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Удаление компании"
        description={
          <>
            Вы уверены, что хотите удалить компанию <span className="font-semibold">{deleteTarget?.name}</span>?
            Это возможно только если с ней не связано ни одного лида.
          </>
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
