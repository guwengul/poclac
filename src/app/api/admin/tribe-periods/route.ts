import { NextResponse } from "next/server";
import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { isAdmin, hrTribeIds } = await requireAdminOrHRPartner();
    const { periodId, tribeId } = await request.json();

    if (!isAdmin && !hrTribeIds.includes(tribeId)) {
      return NextResponse.json({ error: "Not authorized for this tribe" }, { status: 403 });
    }

    const tribePeriod = await prisma.tribePeriod.upsert({
      where: { periodId_tribeId: { periodId, tribeId } },
      create: { periodId, tribeId },
      update: {},
    });

    return NextResponse.json(tribePeriod, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
