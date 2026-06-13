import { NextResponse } from "next/server";
import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ periodId: string; evaluateeId: string }> };

// GET — fetch all scores for an evaluatee in a period
export async function GET(_req: Request, { params }: Params) {
  try { await requireAdminOrHRPartner(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { periodId, evaluateeId } = await params;

  const evaluations = await prisma.evaluation.findMany({
    where: { periodId, evaluateeId },
    include: {
      evaluator: { select: { id: true, name: true } },
      scores: { include: { criterion: { select: { id: true, code: true, name: true } } } },
    },
  });

  const finalScore = await prisma.finalScore.findUnique({
    where: { periodId_evaluateeId: { periodId, evaluateeId } },
  });

  return NextResponse.json({ evaluations, finalScore });
}

// PUT — save final score + justification
export async function PUT(req: Request, { params }: Params) {
  try { await requireAdminOrHRPartner(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { periodId, evaluateeId } = await params;
  const { finalScore, justification } = await req.json();

  const record = await prisma.finalScore.upsert({
    where: { periodId_evaluateeId: { periodId, evaluateeId } },
    create: { periodId, evaluateeId, finalScore, justification },
    update: { finalScore, justification },
  });

  return NextResponse.json(record);
}
