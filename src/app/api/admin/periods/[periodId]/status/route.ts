import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PeriodStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<PeriodStatus, PeriodStatus> = {
  DRAFT: "SCORING_OPEN",
  SCORING_OPEN: "CALIBRATION",
  CALIBRATION: "DISTINCTION",
  DISTINCTION: "CLOSED",
  CLOSED: "CLOSED",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { periodId } = await params;
  const { status } = await req.json();

  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

  const expected = VALID_TRANSITIONS[period.status];
  if (status !== expected) {
    return NextResponse.json({ error: `Invalid transition from ${period.status} to ${status}` }, { status: 400 });
  }

  const updated = await prisma.period.update({
    where: { id: periodId },
    data: { status },
  });

  return NextResponse.json({ period: updated });
}
