import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  email: z.string().optional(),
  isDecisionMaker: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiLeadsAccess();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
    }

    const updated = await prisma.contact.update({ where: { id }, data: parsed.data });

    await logAudit({
      actor,
      action: "UPDATE_CONTACT",
      entityType: "Contact",
      entityId: id,
      newValue: { firstName: updated.firstName, lastName: updated.lastName },
    });

    return NextResponse.json({ contact: updated });
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

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return NextResponse.json({ error: "Контакт не найден" }, { status: 404 });
    }

    await prisma.lead.updateMany({ where: { contactId: id }, data: { contactId: null } });
    await prisma.contact.update({ where: { id }, data: { decisionMakerLeads: { set: [] } } });
    await prisma.contact.delete({ where: { id } });

    await logAudit({
      actor,
      action: "DELETE_CONTACT",
      entityType: "Contact",
      entityId: id,
      oldValue: { firstName: contact.firstName, lastName: contact.lastName },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
