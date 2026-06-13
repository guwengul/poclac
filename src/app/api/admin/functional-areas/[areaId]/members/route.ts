import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ areaId: string }> };

// POST — add member to functional area
export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { areaId } = await params;
  const { personId } = await req.json();

  await prisma.person.update({
    where: { id: personId },
    data: { functionalAreaId: areaId },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — remove member from functional area
export async function DELETE(req: NextRequest, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { areaId } = await params;
  const { personId } = await req.json();

  // Only remove if they belong to this area
  await prisma.person.updateMany({
    where: { id: personId, functionalAreaId: areaId },
    data: { functionalAreaId: null },
  });

  return NextResponse.json({ ok: true });
}
