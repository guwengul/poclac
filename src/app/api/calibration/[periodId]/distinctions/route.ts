import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrHRPartner } from "@/lib/auth";

type Params = { params: Promise<{ periodId: string }> };

// POST /api/calibration/[periodId]/distinctions
// Body: { tribeId, distinctions: { evaluateeId, category }[] }
// Upserts distinctions; if closeTribe=true also moves TribePeriod to CLOSED
export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAdminOrHRPartner(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { periodId } = await params;
  const { tribeId, distinctions, closeTribe } = await req.json() as {
    tribeId: string;
    distinctions: { evaluateeId: string; category: "HIGH_DISTINCTION" | "DISTINCTION" | "NORMAL" }[];
    closeTribe?: boolean;
  };

  if (!tribeId || !Array.isArray(distinctions)) {
    return NextResponse.json({ error: "tribeId and distinctions required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const d of distinctions) {
      await tx.distinction.upsert({
        where: { periodId_evaluateeId: { periodId, evaluateeId: d.evaluateeId } },
        create: { periodId, tribeId, evaluateeId: d.evaluateeId, category: d.category },
        update: { category: d.category, tribeId },
      });
    }

    if (closeTribe) {
      await tx.tribePeriod.updateMany({
        where: { periodId, tribeId },
        data: { status: "CLOSED" },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
