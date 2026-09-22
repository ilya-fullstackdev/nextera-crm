import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { findDuplicateLeads } from "@/lib/duplicates";

const createSchema = z.object({
  companyName: z.string().min(1, "Укажите название компании"),
  niche: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
  source: z.enum([
    "YANDEX_MAPS",
    "GOOGLE_MAPS",
    "INSTAGRAM",
    "TIKTOK",
    "TELEGRAM",
    "WEBSITE",
    "REFERRAL",
    "MANUAL_SEARCH",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactPosition: z.string().optional(),
  contactPhone: z.string().optional(),
  contactTelegram: z.string().optional(),
  contactEmail: z.string().optional(),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Проверьте данные" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    if (!data.force) {
      const duplicates = await findDuplicateLeads({
        companyName: data.companyName,
        website: data.website,
        phone: data.contactPhone,
      });
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            duplicates: duplicates.map((d) => ({
              id: d.id,
              companyName: d.company.name,
              ownerName: `${d.owner.firstName} ${d.owner.lastName}`,
              status: d.status,
            })),
          },
          { status: 409 }
        );
      }
    }

    let company = await prisma.company.findFirst({
      where: { name: { equals: data.companyName.trim(), mode: "insensitive" } },
    });

    if (company) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          niche: company.niche ?? data.niche,
          city: company.city ?? data.city,
          website: company.website ?? data.website,
        },
      });
    } else {
      company = await prisma.company.create({
        data: {
          name: data.companyName.trim(),
          niche: data.niche,
          city: data.city,
          website: data.website,
        },
      });
    }

    let contact = null;
    if (data.contactFirstName) {
      contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          firstName: data.contactFirstName,
          lastName: data.contactLastName,
          position: data.contactPosition,
          phone: data.contactPhone,
          telegram: data.contactTelegram,
          email: data.contactEmail,
        },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        contactId: contact?.id,
        status: "NEW",
        priority: data.priority,
        source: data.source,
        ownerId: actor.id,
        createdById: actor.id,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: actor.id,
        type: "STATUS_CHANGE",
        comment: "Лид создан",
        metadata: { toStatus: "NEW" },
      },
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    await prisma.task.create({
      data: {
        leadId: lead.id,
        title: "Первый контакт",
        type: "CALL",
        dueAt: dueDate,
        assigneeId: actor.id,
        createdById: actor.id,
      },
    });

    await logAudit({
      actor,
      action: "CREATE_LEAD",
      entityType: "Lead",
      entityId: lead.id,
      newValue: { company: company.name },
    });

    return NextResponse.json({ lead: { id: lead.id } });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
