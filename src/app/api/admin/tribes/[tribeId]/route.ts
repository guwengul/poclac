import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ tribeId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { tribeId } = await params;
  const { name, tribeLeadId, tribeTechLeadId } = await req.json();

  const tribe = await prisma.tribe.update({
    where: { id: tribeId },
    data: {
      name: name ?? undefined,
      tribeLeadId: tribeLeadId ?? null,
      tribeTechLeadId: tribeTechLeadId ?? null,
    },
  });
  return NextResponse.json({ tribe });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { tribeId } = await params;
  // Cascade: squads and functional areas deleted via DB cascade
  await prisma.tribe.delete({ where: { id: tribeId } });
  return NextResponse.json({ ok: true });
}
