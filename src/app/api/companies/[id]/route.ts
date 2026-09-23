import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiLeadsAccess, requireApiRole, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  niche: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
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

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 404 });
    }

    const updated = await prisma.company.update({ where: { id }, data: parsed.data });

    await logAudit({
      actor,
      action: "UPDATE_COMPANY",
      entityType: "Company",
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: updated.name },
    });

    return NextResponse.json({ company: updated });
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

    const company = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { leads: true, contacts: true } } },
    });
    if (!company) {
      return NextResponse.json({ error: "Компания не найдена" }, { status: 404 });
    }
    if (company._count.leads > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить компанию, пока с ней связаны лиды. Сначала удалите или перенесите лиды." },
        { status: 409 }
      );
    }

    await prisma.contact.deleteMany({ where: { companyId: id } });
    await prisma.company.delete({ where: { id } });

    await logAudit({ actor, action: "DELETE_COMPANY", entityType: "Company", entityId: id, oldValue: { name: company.name } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
