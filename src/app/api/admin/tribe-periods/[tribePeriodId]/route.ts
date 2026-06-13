import { NextResponse } from "next/server";
import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TribePeriodStatus } from "@prisma/client";

const TRANSITIONS: Partial<Record<TribePeriodStatus, TribePeriodStatus>> = {
  ACTIVE: "CALIBRATION",
  CALIBRATION: "CLOSED",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tribePeriodId: string }> }
) {
  try {
    const { isAdmin, hrTribeIds } = await requireAdminOrHRPartner();
    const { tribePeriodId } = await params;
    const { status } = await req.json();

    const tribePeriod = await prisma.tribePeriod.findUnique({ where: { id: tribePeriodId } });
    if (!tribePeriod) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isAdmin && !hrTribeIds.includes(tribePeriod.tribeId)) {
      return NextResponse.json({ error: "Not authorized for this tribe" }, { status: 403 });
    }

    const expected = TRANSITIONS[tribePeriod.status];
    if (status !== expected) {
      return NextResponse.json({ error: `Invalid transition: ${tribePeriod.status} → ${status}` }, { status: 400 });
    }

    const updated = await prisma.tribePeriod.update({
      where: { id: tribePeriodId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
