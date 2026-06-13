import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdminOrHRPartner } from "@/lib/auth";

type Params = { params: Promise<{ evaluationId: string }> };

// PUT /api/evaluations/[evaluationId]/scores
// Allowed in two contexts:
//   1. Evaluator updating their own draft (SCORING_OPEN period, not yet submitted)
//   2. HR Partner / Admin updating any score during TribePeriod CALIBRATION
export async function PUT(req: NextRequest, { params }: Params) {
  const person = await getCurrentUser();
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { evaluationId } = await params;
  const { scores } = await req.json() as { scores: { criterionId: string; score: number; comment?: string | null }[] };

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      period: { select: { id: true, status: true } },
    },
  });

  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwn = evaluation.evaluatorId === person.id;

  // Check if tribe is in CALIBRATION — allows HR Partner / Admin to update any score
  const tribePeriodInCalibration = await prisma.tribePeriod.findFirst({
    where: {
      periodId: evaluation.periodId,
      status: "CALIBRATION",
    },
  });

  const isCalibrationPhase = !!tribePeriodInCalibration;

  if (isCalibrationPhase) {
    // Must be admin or HR Partner of that tribe
    try { await requireAdminOrHRPartner(); } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // Normal scoring: must be the evaluator, period must be open, not yet submitted
    if (!isOwn) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (evaluation.period.status !== "SCORING_OPEN") {
      return NextResponse.json({ error: "Period is not open for scoring" }, { status: 400 });
    }
    if (evaluation.status === "SUBMITTED") {
      return NextResponse.json({ error: "Evaluation already submitted" }, { status: 400 });
    }
  }

  for (const s of scores) {
    if (!Number.isInteger(s.score) || s.score < 1 || s.score > 5) {
      return NextResponse.json({ error: "Scores must be integers between 1 and 5" }, { status: 400 });
    }
  }

  await Promise.all(
    scores.map((s) =>
      prisma.evaluationScore.upsert({
        where: { evaluationId_criterionId: { evaluationId, criterionId: s.criterionId } },
        create: { evaluationId, criterionId: s.criterionId, score: s.score, comment: s.comment ?? null },
        update: { score: s.score, comment: s.comment ?? null },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
