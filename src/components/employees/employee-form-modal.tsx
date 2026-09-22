"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Wand2, Copy } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/labels";
import type { EmployeeRow } from "@/components/employees/employees-client";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";

function generateClientPassword(length = 12) {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join("");
}

const emptyForm = {
  firstName: "",
  lastName: "",
  login: "",
  password: "",
  role: "OPERATOR" as "OPERATOR" | "MANAGER" | "DIRECTOR",
  status: "ACTIVE" as "ACTIVE" | "BLOCKED",
};

export function EmployeeFormModal({
  open,
  employee,
  onClose,
  onSuccess,
}: {
  open: boolean;
  employee: EmployeeRow | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const isEdit = Boolean(employee);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setShowPassword(false);
      if (employee) {
        setForm({
          firstName: employee.firstName,
          lastName: employee.lastName,
          login: employee.login,
          password: "",
          role: employee.role,
          status: employee.status,
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, employee]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = isEdit ? `/api/employees/${employee!.id}` : "/api/employees";
      const method = isEdit ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        login: form.login,
        role: form.role,
        status: form.status,
      };
      if (!isEdit) {
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить сотрудника");
        return;
      }
      toast.success(isEdit ? "Сотрудник обновлён" : "Сотрудник создан", `${form.firstName} ${form.lastName}`);
      onSuccess();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Редактировать сотрудника" : "Добавить сотрудника"}
      description={isEdit ? undefined : "Новый сотрудник сможет войти в CRM по логину и паролю"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            {isEdit ? "Сохранить" : "Создать аккаунт"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Имя"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
          />
          <Input
            label="Фамилия"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </div>

        <Input
          label="Логин"
          value={form.login}
          onChange={(e) => update("login", e.target.value)}
          hint="Латинские буквы, цифры, точка, дефис, подчёркивание"
          required
        />

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
            {isEdit ? "Новый пароль (необязательно)" : "Пароль"}
          </label>
          <div className="flex gap-2">
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={isEdit ? "Оставьте пустым, чтобы не менять" : "Минимум 6 символов"}
              required={!isEdit}
              className="flex-1"
              suffix={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="pointer-events-auto">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Button
              type="button"
              variant="secondary"
              icon={<Wand2 />}
              onClick={() => {
                update("password", generateClientPassword());
                setShowPassword(true);
              }}
            >
              Сгенерировать
            </Button>
          </div>
          {form.login && form.password && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`Логин: ${form.login}\nПароль: ${form.password}`);
                toast.success("Логин и пароль скопированы");
              }}
              className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-primary-600 hover:text-primary-700"
            >
              <Copy className="h-3.5 w-3.5" />
              Копировать логин и пароль
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Роль"
            value={form.role}
            onChange={(e) => update("role", e.target.value as typeof form.role)}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Статус"
            value={form.status}
            onChange={(e) => update("status", e.target.value as typeof form.status)}
          >
            {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p className="rounded-md bg-danger-50 px-3 py-2 text-[13px] text-danger-700">{error}</p>
        )}
      </form>
    </Modal>
  );
}
