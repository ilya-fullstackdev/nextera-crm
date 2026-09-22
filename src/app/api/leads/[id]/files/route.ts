import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireApiUser, ApiAuthError } from "@/lib/auth/guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireApiUser();
    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const category = formData.get("category");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл слишком большой (максимум 20 МБ)" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "leads", id);
    await mkdir(dir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-А-Яа-яЁё ]/g, "_");
    const storedName = `${Date.now()}_${safeName}`;
    const filePath = path.join(dir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const storagePath = `/uploads/leads/${id}/${storedName}`;

    const leadFile = await prisma.leadFile.create({
      data: {
        leadId: id,
        fileName: file.name,
        category: typeof category === "string" ? category : undefined,
        storagePath,
        size: file.size,
        uploadedById: actor.id,
      },
      include: { uploadedBy: true },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: actor.id,
        type: "FILE",
        comment: `Загружен файл: ${file.name}`,
      },
    });

    return NextResponse.json({ file: leadFile });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
