import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ tribeId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { tribeId } = await params;
  const { personId } = await req.json();

  await prisma.tribeHRPartner.create({ data: { tribeId, personId } });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { tribeId } = await params;
  const { personId } = await req.json();

  await prisma.tribeHRPartner.deleteMany({ where: { tribeId, personId } });
  return NextResponse.json({ ok: true });
}
