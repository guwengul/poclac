import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ periodId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const person = await getCurrentUser();
  if (!person?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { periodId } = await params;
  const config = await prisma.distinctionConfig.findUnique({ where: { periodId } });
  return NextResponse.json(config ?? { highPct: 10, distPct: 10 });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const person = await getCurrentUser();
  if (!person?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { periodId } = await params;
  const { highPct, distPct } = await req.json() as { highPct: number; distPct: number };

  if (highPct < 0 || highPct > 100 || distPct < 0 || distPct > 100 || highPct + distPct > 100) {
    return NextResponse.json({ error: "Invalid percentages" }, { status: 400 });
  }

  const config = await prisma.distinctionConfig.upsert({
    where: { periodId },
    create: { periodId, highPct: highPct / 100, distPct: distPct / 100 },
    update: { highPct: highPct / 100, distPct: distPct / 100 },
  });
  return NextResponse.json(config);
}
