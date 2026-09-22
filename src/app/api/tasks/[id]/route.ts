import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";

const updateSchema = z.object({
  status: z.enum(["PENDING", "DONE", "CANCELLED"]).optional(),
  title: z.string().min(1).optional(),
  dueAt: z.string().optional(),
  comment: z.string().optional(),
  type: z.enum(["CALL", "MEETING", "EMAIL", "FOLLOW_UP", "OTHER"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiUser();
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }
    if (actor.role !== "DIRECTOR" && task.assigneeId !== actor.id && task.createdById !== actor.id) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const updateData: Record<string, unknown> = { ...data };
    if (data.dueAt) updateData.dueAt = new Date(data.dueAt);
    if (data.status === "DONE") updateData.completedAt = new Date();
    if (data.status === "PENDING") updateData.completedAt = null;

    const updated = await prisma.task.update({ where: { id }, data: updateData });

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
