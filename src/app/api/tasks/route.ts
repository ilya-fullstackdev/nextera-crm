import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";

const createSchema = z.object({
  leadId: z.string().optional(),
  title: z.string().min(1, "Укажите название задачи"),
  type: z.enum(["CALL", "MEETING", "EMAIL", "FOLLOW_UP", "OTHER"]).default("OTHER"),
  dueAt: z.string().min(1, "Укажите дату"),
  comment: z.string().optional(),
  assigneeId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    const task = await prisma.task.create({
      data: {
        leadId: data.leadId,
        title: data.title,
        type: data.type,
        dueAt: new Date(data.dueAt),
        comment: data.comment,
        assigneeId: data.assigneeId ?? actor.id,
        createdById: actor.id,
      },
      include: { assignee: true, lead: { include: { company: true } } },
    });

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
