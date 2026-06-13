import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { squadId, personId } = await req.json();
  await prisma.person.update({ where: { id: personId }, data: { squadId } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { squadId, personId } = await req.json();
  await prisma.person.updateMany({
    where: { id: personId, squadId },
    data: { squadId: null },
  });
  return NextResponse.json({ ok: true });
}
