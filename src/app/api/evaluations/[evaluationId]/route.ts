import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ evaluationId: string }> };

// GET /api/evaluations/[evaluationId] — get evaluation with scores
export async function GET(_req: NextRequest, { params }: Params) {
  const person = await getCurrentUser();
  if (!person) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { evaluationId } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      evaluatee: { select: { id: true, name: true, chapter: true } },
      period: { select: { id: true, name: true, status: true, scoringDeadline: true } },
      scores: { include: { criterion: { select: { id: true, code: true, name: true, description: true } } } },
    },
  });

  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (evaluation.evaluatorId !== person.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ evaluation });
}
