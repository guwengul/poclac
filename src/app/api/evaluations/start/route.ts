import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/evaluations/start — create an evaluation record from an assignment
export async function POST(req: NextRequest) {
  const person = await getCurrentUser();
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { periodId, evaluateeId, role } = await req.json();

  if (!periodId || !evaluateeId || !role) {
    return NextResponse.json({ error: "periodId, evaluateeId, and role are required" }, { status: 400 });
  }

  // Self-evaluation guard
  if (evaluateeId === person.id) {
    return NextResponse.json({ error: "Self-evaluation is not allowed" }, { status: 400 });
  }

  // Check period is open
  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period || period.status !== "SCORING_OPEN") {
    return NextResponse.json({ error: "Period is not open for scoring" }, { status: 400 });
  }

  // Verify assignment exists
  const assignment = await prisma.evaluatorAssignment.findFirst({
    where: { periodId, evaluateeId, evaluatorId: person.id, role },
  });
  if (!assignment) {
    return NextResponse.json({ error: "No assignment found" }, { status: 404 });
  }

  // Create or return existing evaluation
  const existing = await prisma.evaluation.findFirst({
    where: { periodId, evaluateeId, evaluatorId: person.id, role },
  });
  if (existing) return NextResponse.json({ evaluation: existing });

  const evaluation = await prisma.evaluation.create({
    data: {
      periodId,
      evaluateeId,
      evaluatorId: person.id,
      role,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ evaluation }, { status: 201 });
}
