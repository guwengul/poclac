import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, tribeId, chapterLeadId } = await req.json();

  if (!name || !tribeId) {
    return NextResponse.json({ error: "name and tribeId are required" }, { status: 400 });
  }

  const area = await prisma.functionalArea.create({
    data: { name, tribeId, chapterLeadId: chapterLeadId ?? null },
  });

  return NextResponse.json({ area }, { status: 201 });
}
