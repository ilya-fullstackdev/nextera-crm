import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiEmployeesAccess, ApiAuthError } from "@/lib/auth/guards";
import { canManageRole } from "@/lib/permissions";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

const schema = z.object({ password: z.string().min(6).optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiEmployeesAccess();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректный пароль" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.deletedAt) {
      return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
    }

    if (!canManageRole(actor.role, target.role)) {
      return NextResponse.json(
        { error: "Вы можете менять пароли только сотрудникам отдела холодных звонков" },
        { status: 403 }
      );
    }

    const newPassword = parsed.data.password ?? generatePassword();
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({ where: { id }, data: { passwordHash } });
    await logAudit({ actor, action: "RESET_PASSWORD", entityType: "User", entityId: id });

    return NextResponse.json({ password: newPassword });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
