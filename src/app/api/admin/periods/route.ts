import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const periods = await prisma.period.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evaluations: true, finalScores: true } },
    },
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

  // Create period with default role×criterion configs (all active, equal weights)
  const criteria = await prisma.criterion.findMany();
  const roles = ["PO", "CL", "AC"] as const;

  const period = await prisma.period.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      scoringDeadline: new Date(scoringDeadline),
      calibrationDeadline: new Date(calibrationDeadline),
      status: "DRAFT",
      roleCriterionConfigs: {
        create: roles.flatMap((role) =>
          criteria.map((c) => ({
            role,
            criterionId: c.id,
            isActive: true,
            weight: parseFloat((100 / criteria.length).toFixed(4)),
          }))
        ),
      },
      scoringConstraints: {
        create: roles.map((role) => ({ role, mode: "M1_FREE" })),
      },
    },
  });

  return NextResponse.json({ period }, { status: 201 });
}
