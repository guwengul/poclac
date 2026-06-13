import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ evaluationId: string }> };

// PUT /api/evaluations/[evaluationId]/scores — save draft scores
export async function PUT(req: NextRequest, { params }: Params) {
  const person = await getCurrentUser();
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { evaluationId } = await params;
  const { scores } = await req.json() as { scores: { criterionId: string; score: number }[] };

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: { period: { select: { status: true } } },
  });

  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (evaluation.evaluatorId !== person.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (evaluation.period.status !== "SCORING_OPEN") return NextResponse.json({ error: "Period is not open for scoring" }, { status: 400 });
  if (evaluation.status === "SUBMITTED") return NextResponse.json({ error: "Evaluation already submitted" }, { status: 400 });

  // Validate scores: 1–5 integers only
  for (const s of scores) {
    if (!Number.isInteger(s.score) || s.score < 1 || s.score > 5) {
      return NextResponse.json({ error: "Scores must be integers between 1 and 5" }, { status: 400 });
    }
  }

  // Upsert each score
  await Promise.all(
    scores.map((s) =>
      prisma.evaluationScore.upsert({
        where: { evaluationId_criterionId: { evaluationId, criterionId: s.criterionId } },
        create: { evaluationId, criterionId: s.criterionId, score: s.score },
        update: { score: s.score },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
