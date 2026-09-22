"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Send, Mail, Contact2, ExternalLink, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import type { ContextMenuItem } from "@/components/ui/context-menu";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteModal } from "@/components/shared/confirm-delete-modal";
import { EditContactModal } from "@/components/contacts/edit-contact-modal";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/generated/prisma/enums";

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  isDecisionMaker: boolean;
  company: { id: string; name: string };
  leads: { id: string }[];
}

export function ContactsTable({ contacts, currentUserRole }: { contacts: ContactRow[]; currentUserRole?: Role }) {
  const router = useRouter();
  const toast = useToast();
  const [editTarget, setEditTarget] = useState<ContactRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/contacts/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Не удалось удалить контакт");
      return;
    }
    toast.success("Контакт удалён", deleteTarget.firstName);
    setDeleteTarget(null);
    router.refresh();
  }

  const columns: Column<ContactRow>[] = [
    {
      key: "name",
      header: "Контакт",
      render: (c) => (
        <div>
          <p className="font-medium">
            {c.firstName} {c.lastName ?? ""}
          </p>
          <p className="text-xs text-text-tertiary">{c.company.name}</p>
        </div>
      ),
    },
    {
      key: "position",
      header: "Должность",
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {c.position ?? "—"}
          {c.isDecisionMaker && <Badge tone="primary">ЛПР</Badge>}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Телефон",
      render: (c) =>
        c.phone ? (
          <a href={`tel:${c.phone}`} onClick={stop} className="flex items-center gap-1.5 text-primary-600 hover:underline">
            <Phone className="h-3.5 w-3.5" />
            {c.phone}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "telegram",
      header: "Telegram",
      render: (c) =>
        c.telegram ? (
          <a
            href={`https://t.me/${c.telegram.replace("@", "")}`}
            target="_blank"
            onClick={stop}
            className="flex items-center gap-1.5 text-primary-600 hover:underline"
          >
            <Send className="h-3.5 w-3.5" />
            {c.telegram}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "email",
      header: "Email",
      render: (c) =>
        c.email ? (
          <a href={`mailto:${c.email}`} onClick={stop} className="flex items-center gap-1.5 text-primary-600 hover:underline">
            <Mail className="h-3.5 w-3.5" />
            {c.email}
          </a>
        ) : (
          "—"
        ),
    },
    { key: "leads", header: "Лиды", render: (c) => c.leads.length },
  ];

  function buildContextMenu(contact: ContactRow): ContextMenuItem[] {
    const items: ContextMenuItem[] = [];
    if (contact.leads[0]) {
      items.push({
        label: "Открыть лид",
        icon: <ExternalLink />,
        onClick: () => router.push(`/crm/leads/${contact.leads[0].id}`),
      });
    }
    items.push({ label: "Редактировать", icon: <Pencil />, onClick: () => setEditTarget(contact) });
    if (currentUserRole === "DIRECTOR") {
      items.push({
        label: "Удалить контакт",
        icon: <Trash2 />,
        danger: true,
        onClick: () => setDeleteTarget(contact),
      });
    }
    return items;
  }

  const emptyState = <EmptyState icon={<Contact2 />} title="Контакты не найдены" />;

  return (
    <>
      <div className="hidden md:block">
        <Table
          columns={columns}
          rows={contacts}
          rowKey={(c) => c.id}
          onRowClick={(c) => c.leads[0] && router.push(`/crm/leads/${c.leads[0].id}`)}
          contextMenuItems={buildContextMenu}
          emptyState={emptyState}
        />
      </div>

      <div className="space-y-2.5 md:hidden">
        {contacts.length === 0
          ? <div className="py-12">{emptyState}</div>
          : contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => contact.leads[0] && router.push(`/crm/leads/${contact.leads[0].id}`)}
                className="rounded-lg border border-border-subtle bg-white p-4 active:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[15px] font-semibold text-text-primary">
                        {contact.firstName} {contact.lastName ?? ""}
                      </p>
                      {contact.isDecisionMaker && <Badge tone="primary">ЛПР</Badge>}
                    </div>
                    <p className="truncate text-[13px] text-text-secondary">
                      {contact.company.name}
                      {contact.position ? ` · ${contact.position}` : ""}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                      trigger={
                        <button className="-m-2 rounded-md p-2 text-text-tertiary hover:bg-surface-hover hover:text-text-primary">
                          <MoreVertical className="h-4.5 w-4.5" />
                        </button>
                      }
                      items={buildContextMenu(contact)}
                    />
                  </div>
                </div>

                {(contact.phone || contact.telegram || contact.email) && (
                  <div className="mt-3 flex items-center gap-1 border-t border-border-subtle pt-2.5">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} onClick={stop} className="-m-2 rounded-md p-2 text-primary-600">
                        <Phone className="h-4.5 w-4.5" />
                      </a>
                    )}
                    {contact.telegram && (
                      <a
                        href={`https://t.me/${contact.telegram.replace("@", "")}`}
                        target="_blank"
                        onClick={stop}
                        className="-m-2 rounded-md p-2 text-primary-600"
                      >
                        <Send className="h-4.5 w-4.5" />
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} onClick={stop} className="-m-2 rounded-md p-2 text-primary-600">
                        <Mail className="h-4.5 w-4.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
      </div>

      <EditContactModal contact={editTarget} onClose={() => setEditTarget(null)} />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Удаление контакта"
        description={
          <>
            Вы уверены, что хотите удалить контакт{" "}
            <span className="font-semibold">
              {deleteTarget?.firstName} {deleteTarget?.lastName}
            </span>
            ?
          </>
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
