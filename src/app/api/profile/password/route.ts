import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Новый пароль минимум 6 символов"),
});

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      omit: { passwordHash: false },
    });
    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Текущий пароль указан неверно" }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: actor.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
