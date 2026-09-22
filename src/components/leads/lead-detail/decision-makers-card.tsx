"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { ContactRef } from "@/types/lead";

export function DecisionMakersCard({
  leadId,
  decisionMakers,
  companyContacts,
  canEdit,
  onChange,
}: {
  leadId: string;
  decisionMakers: ContactRef[];
  companyContacts: ContactRef[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingId, setExistingId] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", position: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const availableExisting = companyContacts.filter((c) => !decisionMakers.some((d) => d.id === c.id));

  async function handleAdd() {
    setLoading(true);
    try {
      const body = mode === "existing" ? { contactId: existingId } : form;
      const res = await fetch(`/api/leads/${leadId}/decision-makers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Не удалось добавить участника");
        return;
      }
      toast.success("Участник добавлен");
      setOpen(false);
      setForm({ firstName: "", lastName: "", position: "", phone: "" });
      setExistingId("");
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(contactId: string) {
    const res = await fetch(`/api/leads/${leadId}/decision-makers`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (res.ok) onChange();
  }

  return (
    <Card>
      <CardHeader
        title="Участвуют в решении"
        action={
          canEdit && (
            <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setOpen(true)}>
              Добавить
            </Button>
          )
        }
      />
      <CardBody>
        {decisionMakers.length === 0 ? (
          <p className="text-[13px] text-text-tertiary">Участники не добавлены</p>
        ) : (
          <div className="space-y-2">
            {decisionMakers.map((dm) => (
              <div key={dm.id} className="flex items-center justify-between gap-2 rounded-md border border-border-subtle px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-text-primary">
                    {dm.firstName} {dm.lastName ?? ""}
                  </p>
                  {dm.position && <Badge tone="neutral">{dm.position}</Badge>}
                </div>
                {canEdit && (
                  <button onClick={() => handleRemove(dm.id)} className="shrink-0 text-text-tertiary hover:text-danger-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Добавить участника"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              loading={loading}
              disabled={mode === "existing" ? !existingId : !form.firstName}
              onClick={handleAdd}
            >
              Добавить
            </Button>
          </>
        }
      >
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-[13px] font-medium ${
              mode === "existing" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-border-default text-text-secondary"
            }`}
          >
            Существующий контакт
          </button>
          <button
            onClick={() => setMode("new")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-[13px] font-medium ${
              mode === "new" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-border-default text-text-secondary"
            }`}
          >
            Новый контакт
          </button>
        </div>

        {mode === "existing" ? (
          <Select placeholder="Выберите контакт" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            {availableExisting.length === 0 && <option value="">Нет доступных контактов</option>}
            {availableExisting.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName ?? ""} {c.position ? `— ${c.position}` : ""}
              </option>
            ))}
          </Select>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Имя" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Фамилия" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Input
              label="Роль в решении"
              placeholder="Например: маркетолог, закупки"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
            <Input label="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        )}
      </Modal>
    </Card>
  );
}
