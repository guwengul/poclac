import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const periods = await prisma.period.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { evaluations: true } } },
  });

  return NextResponse.json({ periods });
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, startDate, endDate, scoringDeadline, calibrationDeadline } = await req.json();

  if (!name || !startDate || !endDate || !scoringDeadline || !calibrationDeadline) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Step 1: Create period
  const period = await prisma.period.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      scoringDeadline: new Date(scoringDeadline),
      calibrationDeadline: new Date(calibrationDeadline),
      status: "DRAFT",
    },
  });

  // Step 2: Create role×criterion configs
  const criteria = await prisma.criterion.findMany();
  const roles = ["PO", "CL", "AC"] as const;

  await prisma.roleCriterionConfig.createMany({
    data: roles.flatMap((role) =>
      criteria.map((c) => ({
        periodId: period.id,
        role,
        criterionId: c.id,
        isActive: true,
        weight: parseFloat((100 / criteria.length).toFixed(4)),
      }))
    ),
  });

  // Step 3: Create scoring constraints
  await prisma.scoringConstraintConfig.createMany({
    data: roles.map((role) => ({ periodId: period.id, role, mode: "M1_FREE" as const })),
  });

  return NextResponse.json({ period }, { status: 201 });
}
