import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, tribeId, productOwnerId, agileCoachId } = await req.json();
  if (!name || !tribeId) {
    return NextResponse.json({ error: "Name and Tribe are required." }, { status: 400 });
  }

  const squad = await prisma.squad.create({
    data: { name, tribeId, productOwnerId: productOwnerId ?? null, agileCoachId: agileCoachId ?? null },
  });
  return NextResponse.json({ squad }, { status: 201 });
}
