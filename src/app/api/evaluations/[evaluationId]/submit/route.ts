import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ evaluationId: string }> };

// POST /api/evaluations/[evaluationId]/submit — lock evaluation
export async function POST(_req: NextRequest, { params }: Params) {
  const person = await getCurrentUser();
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { evaluationId } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      period: { select: { status: true } },
      scores: true,
    },
  });

  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (evaluation.evaluatorId !== person.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (evaluation.period.status !== "SCORING_OPEN") return NextResponse.json({ error: "Period is not open for scoring" }, { status: 400 });
  if (evaluation.status === "SUBMITTED") return NextResponse.json({ error: "Already submitted" }, { status: 400 });

  // Require all criteria to be scored
  const criteria = await prisma.criterion.findMany({ where: { isActive: true } });
  const scoredIds = new Set(evaluation.scores.map((s) => s.criterionId));
  const missing = criteria.filter((c) => !scoredIds.has(c.id));
  if (missing.length > 0) {
    return NextResponse.json({
      error: `Missing scores for: ${missing.map((c) => c.code).join(", ")}`,
    }, { status: 400 });
  }

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  return NextResponse.json({ evaluation: updated });
}
