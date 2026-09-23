import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { revalidateCrm } from "@/lib/revalidate";

const updateSchema = z.object({
  type: z.enum(["HOSTING", "DOMAIN", "SSL", "EMAIL", "SERVICE", "OTHER"]).optional(),
  name: z.string().min(1).optional(),
  url: z.string().optional(),
  amount: z.coerce.number().int().min(0).optional(),
  period: z.enum(["MONTHLY", "YEARLY"]).optional(),
  renewsAt: z.string().nullable().optional(),
  comment: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const expense = await prisma.projectExpense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const updated = await prisma.projectExpense.update({
      where: { id },
      data: {
        ...(data.type ? { type: data.type } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.url !== undefined ? { url: data.url.trim() || null } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.period ? { period: data.period } : {}),
        ...(data.renewsAt !== undefined ? { renewsAt: data.renewsAt ? new Date(data.renewsAt) : null } : {}),
        ...(data.comment !== undefined ? { comment: data.comment.trim() || null } : {}),
      },
    });

    await logAudit({
      actor,
      action: "UPDATE_EXPENSE",
      entityType: "ProjectExpense",
      entityId: id,
      newValue: { expense: updated.name },
    });

    revalidateCrm();
    return NextResponse.json({ expense: updated });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiRole(["DIRECTOR"]);
    const { id } = await params;

    const expense = await prisma.projectExpense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
    }

    await prisma.projectExpense.delete({ where: { id } });

    await logAudit({
      actor,
      action: "DELETE_EXPENSE",
      entityType: "ProjectExpense",
      entityId: id,
      newValue: { expense: expense.name },
    });

    revalidateCrm();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
