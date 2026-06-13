import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ squadId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { squadId } = await params;
  const { name, productOwnerId, agileCoachId } = await req.json();

  const squad = await prisma.squad.update({
    where: { id: squadId },
    data: {
      name: name ?? undefined,
      productOwnerId: productOwnerId ?? null,
      agileCoachId: agileCoachId ?? null,
    },
  });
  return NextResponse.json({ squad });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { squadId } = await params;
  // Clear squad from members
  await prisma.person.updateMany({ where: { squadId }, data: { squadId: null } });
  await prisma.squad.delete({ where: { id: squadId } });
  return NextResponse.json({ ok: true });
}
