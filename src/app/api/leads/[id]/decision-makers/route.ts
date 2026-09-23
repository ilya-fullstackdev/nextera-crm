import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, ApiAuthError } from "@/lib/auth/guards";
import { applyAutoStatus } from "@/lib/lead-progression";
import { revalidateCrm } from "@/lib/revalidate";

const schema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiLeadsAccess();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    const data = parsed.data;

    let contactId = data.contactId;
    if (!contactId) {
      if (!data.firstName) {
        return NextResponse.json({ error: "Укажите имя участника" }, { status: 400 });
      }
      const contact = await prisma.contact.create({
        data: {
          companyId: lead.companyId,
          firstName: data.firstName,
          lastName: data.lastName,
          position: data.position,
          phone: data.phone,
          isDecisionMaker: true,
        },
      });
      contactId = contact.id;
    }

    await prisma.lead.update({
      where: { id },
      data: { decisionMakers: { connect: { id: contactId } } },
    });

    // Найден ЛПР — лид переходит на следующий шаг воронки сам.
    const autoStatus = await applyAutoStatus(id, actor);

    revalidateCrm();
    return NextResponse.json({ ok: true, autoStatus });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

const removeSchema = z.object({ contactId: z.string().min(1) });

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiLeadsAccess();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    await prisma.lead.update({
      where: { id },
      data: { decisionMakers: { disconnect: { id: parsed.data.contactId } } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
