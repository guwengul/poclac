import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ areaId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { areaId } = await params;
  const { name, chapterLeadId } = await req.json();

  const area = await prisma.functionalArea.update({
    where: { id: areaId },
    data: { name: name ?? undefined, chapterLeadId: chapterLeadId ?? null },
  });
  return NextResponse.json({ area });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { areaId } = await params;
  await prisma.person.updateMany({ where: { functionalAreaId: areaId }, data: { functionalAreaId: null } });
  await prisma.functionalArea.delete({ where: { id: areaId } });
  return NextResponse.json({ ok: true });
}
