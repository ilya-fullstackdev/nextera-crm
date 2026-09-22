"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось войти");
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
      router.push(from && from !== "/login" ? from : "/crm");
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border-subtle bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <Input
              label="Логин"
              name="login"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
            <Input
              label="Пароль"
              name="password"
              type="password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="mt-4 rounded-md bg-danger-50 px-3 py-2 text-[13px] text-danger-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="mt-5 w-full justify-center"
            loading={loading}
            icon={<LogIn />}
          >
            Войти
          </Button>
        </form>

        <p className="mt-5 text-center text-[12px] text-text-tertiary">
          Доступ предоставляется руководителем. Публичной регистрации нет.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
