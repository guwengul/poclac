import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/evaluations — list all evaluations the current user must complete
export async function GET() {
  const person = await getCurrentUser();
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find active periods in SCORING_OPEN status
  const periods = await prisma.period.findMany({
    where: { status: "SCORING_OPEN" },
    select: { id: true, name: true, scoringDeadline: true },
  });

  if (periods.length === 0) {
    return NextResponse.json({ evaluations: [] });
  }

  const periodIds = periods.map((p) => p.id);

  // Find all assignments where this person is the evaluator
  const assignments = await prisma.evaluatorAssignment.findMany({
    where: { evaluatorId: person.id, periodId: { in: periodIds } },
    include: {
      evaluatee: { select: { id: true, name: true, chapter: true } },
      period: { select: { id: true, name: true, scoringDeadline: true } },
    },
  });

  // For each assignment, find or note the existing evaluation
  const evaluationIds = assignments.map((a) => ({ periodId: a.periodId, evaluateeId: a.evaluateeId, evaluatorId: person.id }));

  const existingEvals = evaluationIds.length > 0
    ? await prisma.evaluation.findMany({
        where: {
          evaluatorId: person.id,
          periodId: { in: periodIds },
        },
        select: { id: true, periodId: true, evaluateeId: true, status: true },
      })
    : [];

  const evalMap: Record<string, typeof existingEvals[0]> = {};
  for (const e of existingEvals) {
    evalMap[`${e.periodId}-${e.evaluateeId}`] = e;
  }

  const result = assignments.map((a) => {
    const key = `${a.periodId}-${a.evaluateeId}`;
    const ev = evalMap[key];
    return {
      assignmentId: a.id,
      role: a.role,
      evaluatee: a.evaluatee,
      period: a.period,
      evaluationId: ev?.id ?? null,
      status: ev?.status ?? "NOT_STARTED",
    };
  });

  return NextResponse.json({ evaluations: result });
}
