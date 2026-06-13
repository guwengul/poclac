import { NextResponse } from "next/server";
import { requireAdminOrHRPartner, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTribeAssignments } from "@/lib/assignments";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tribePeriodId: string }> }
) {
  try {
    const { isAdmin, hrTribeIds } = await requireAdminOrHRPartner();
    const person = await getCurrentUser();
    const { tribePeriodId } = await params;

    const tribePeriod = await prisma.tribePeriod.findUnique({
      where: { id: tribePeriodId },
      include: { period: true },
    });

    if (!tribePeriod) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isAdmin && !hrTribeIds.includes(tribePeriod.tribeId)) {
      return NextResponse.json({ error: "Not authorized for this tribe" }, { status: 403 });
    }
    if (tribePeriod.status !== "PENDING") {
      return NextResponse.json({ error: "Already activated" }, { status: 400 });
    }

    const [updated, assignmentResult] = await Promise.all([
      prisma.tribePeriod.update({
        where: { id: tribePeriodId },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
          activatedById: person!.id,
        },
      }),
      generateTribeAssignments(tribePeriod.periodId, tribePeriod.tribeId),
    ]);

    return NextResponse.json({ tribePeriod: updated, assignments: assignmentResult });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
