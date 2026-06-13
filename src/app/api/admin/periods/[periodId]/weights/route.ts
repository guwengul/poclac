import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EvaluatorRole } from "@prisma/client";

type Params = { params: Promise<{ periodId: string }> };

// GET — fetch current weight config for a period
export async function GET(_req: Request, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { periodId } = await params;

  const [roleWeights, criterionWeights, criteria] = await Promise.all([
    prisma.roleWeightConfig.findMany({ where: { periodId } }),
    prisma.roleCriterionConfig.findMany({
      where: { periodId },
      include: { criterion: { select: { id: true, code: true, name: true } } },
    }),
    prisma.criterion.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
  ]);

  return NextResponse.json({ roleWeights, criterionWeights, criteria });
}

// PUT — save full weight config (upsert all)
export async function PUT(req: Request, { params }: Params) {
  try { await requireAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { periodId } = await params;
  const { roleWeights, criterionWeights } = await req.json() as {
    roleWeights: { role: EvaluatorRole; upperWeight: number }[];
    criterionWeights: { role: EvaluatorRole; criterionId: string; weight: number; isActive: boolean }[];
  };

  // Validate role weights sum to 100
  const total = roleWeights.reduce((s, r) => s + r.upperWeight, 0);
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: "Role weights must sum to 100" }, { status: 400 });
  }

  await prisma.$transaction([
    // Role weights
    ...roleWeights.map(r =>
      prisma.roleWeightConfig.upsert({
        where: { periodId_role: { periodId, role: r.role } },
        create: { periodId, role: r.role, upperWeight: r.upperWeight },
        update: { upperWeight: r.upperWeight },
      })
    ),
    // Criterion weights per role
    ...criterionWeights.map(c =>
      prisma.roleCriterionConfig.upsert({
        where: { periodId_role_criterionId: { periodId, role: c.role, criterionId: c.criterionId } },
        create: { periodId, role: c.role, criterionId: c.criterionId, weight: c.weight, isActive: c.isActive },
        update: { weight: c.weight, isActive: c.isActive },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
