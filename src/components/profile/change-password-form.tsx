"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось изменить пароль");
        return;
      }
      toast.success("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Текущий пароль"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <Input
        label="Новый пароль"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        hint="Минимум 6 символов"
        required
      />
      {error && <p className="rounded-md bg-danger-50 px-3 py-2 text-[13px] text-danger-700">{error}</p>}
      <Button type="submit" variant="primary" loading={loading}>
        Изменить пароль
      </Button>
    </form>
  );
}
