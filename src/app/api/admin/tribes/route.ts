import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tribes = await prisma.tribe.findMany({
    include: {
      tribeLead: { select: { id: true, name: true, email: true } },
      squads: { include: { _count: { select: { memberships: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tribes });
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, tribeLeadId } = await req.json();
  if (!name || !tribeLeadId) {
    return NextResponse.json({ error: "Name and Tribe Lead are required." }, { status: 400 });
  }

  const tribe = await prisma.tribe.create({ data: { name, tribeLeadId } });
  return NextResponse.json({ tribe }, { status: 201 });
}
