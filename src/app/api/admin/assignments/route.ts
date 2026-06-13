import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrHRPartner } from "@/lib/auth";
import { EvaluatorRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try { await requireAdminOrHRPartner(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const periodId = req.nextUrl.searchParams.get("periodId");
  if (!periodId) return NextResponse.json({ error: "periodId required" }, { status: 400 });

  const assignments = await prisma.evaluatorAssignment.findMany({
    where: { periodId },
    include: {
      evaluatee: { select: { id: true, name: true, email: true } },
      evaluator: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ evaluatee: { name: "asc" } }, { role: "asc" }],
  });

  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  try { await requireAdminOrHRPartner(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { periodId, evaluateeId, evaluatorId, role } = await req.json();

  if (!periodId || !evaluateeId || !evaluatorId || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Self-evaluation guard
  if (evaluateeId === evaluatorId) {
    return NextResponse.json({ error: "A person cannot evaluate themselves." }, { status: 400 });
  }

  const assignment = await prisma.evaluatorAssignment.upsert({
    where: { periodId_evaluateeId_role: { periodId, evaluateeId, role: role as EvaluatorRole } },
    update: { evaluatorId },
    create: { periodId, evaluateeId, evaluatorId, role: role as EvaluatorRole },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  try { await requireAdminOrHRPartner(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { periodId, evaluateeId, role } = await req.json();

  await prisma.evaluatorAssignment.deleteMany({
    where: { periodId, evaluateeId, role: role as EvaluatorRole },
  });

  return NextResponse.json({ ok: true });
}
