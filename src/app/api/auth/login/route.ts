import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите логин и пароль" }, { status: 400 });
  }

  const { password } = parsed.data;
  const login = parsed.data.login.trim();

  const user = await prisma.user.findUnique({ where: { login }, omit: { passwordHash: false } });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  if (user.status === "BLOCKED") {
    return NextResponse.json(
      { error: "Аккаунт заблокирован. Обратитесь к руководителю." },
      { status: 403 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
}
