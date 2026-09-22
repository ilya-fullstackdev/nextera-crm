"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { EmployeeRow } from "@/components/employees/employees-client";

export function DeleteEmployeeModal({
  employee,
  colleagues,
  onClose,
  onSuccess,
}: {
  employee: EmployeeRow | null;
  colleagues: EmployeeRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresReassignment, setRequiresReassignment] = useState<{
    activeLeadsCount: number;
    pendingTasksCount: number;
  } | null>(null);
  const [reassignToId, setReassignToId] = useState("");

  useEffect(() => {
    if (employee) {
      setRequiresReassignment(null);
      setReassignToId("");
      setError(null);
    }
  }, [employee]);

  async function handleDelete() {
    if (!employee) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reassignToId ? { reassignToId } : {}),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (data.requiresReassignment) {
          setRequiresReassignment(data);
          return;
        }
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить сотрудника");
        return;
      }

      toast.success("Сотрудник удалён", `${employee.firstName} ${employee.lastName}`);
      onSuccess();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  if (!employee) return null;

  return (
    <Modal
      open={Boolean(employee)}
      onClose={onClose}
      title="Удаление сотрудника"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={Boolean(requiresReassignment) && !reassignToId}
            onClick={handleDelete}
          >
            Удалить
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-text-primary">
            Вы уверены, что хотите удалить аккаунт{" "}
            <span className="font-semibold">
              {employee.firstName} {employee.lastName}
            </span>
            ?
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            История действий сотрудника сохранится. Восстановить доступ будет невозможно без создания нового аккаунта.
          </p>
        </div>
      </div>

      {requiresReassignment && (
        <div className="mt-4 rounded-md border border-warning-100 bg-warning-50 p-3">
          <p className="text-[13px] font-medium text-warning-700">
            У сотрудника есть{" "}
            {requiresReassignment.activeLeadsCount > 0 && `${requiresReassignment.activeLeadsCount} активных лидов`}
            {requiresReassignment.activeLeadsCount > 0 && requiresReassignment.pendingTasksCount > 0 && " и "}
            {requiresReassignment.pendingTasksCount > 0 && `${requiresReassignment.pendingTasksCount} незавершённых задач`}
          </p>
          <p className="mt-1 text-[13px] text-warning-700">
            Выберите сотрудника, которому нужно передать активные лиды и задачи перед удалением.
          </p>
          <div className="mt-3">
            <Select
              placeholder="Выберите сотрудника"
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
            >
              {colleagues.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-danger-50 px-3 py-2 text-[13px] text-danger-700">{error}</p>
      )}
    </Modal>
  );
}
