import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CalibrationScoreEditor } from "./calibration-form";

export default async function CalibrationPersonPage({
  params,
}: { params: Promise<{ periodId: string; evaluateeId: string }> }) {
  try { await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  const { periodId, evaluateeId } = await params;

  const [period, evaluatee, evaluations, criteria, roleWeightConfigs, criterionConfigs, finalScore] = await Promise.all([
    prisma.period.findUnique({ where: { id: periodId } }),
    prisma.person.findUnique({
      where: { id: evaluateeId },
      select: { id: true, name: true, functionalArea: { select: { name: true } }, squad: { select: { name: true } } },
    }),
    prisma.evaluation.findMany({
      where: { periodId, evaluateeId },
      include: {
        evaluator: { select: { name: true } },
        scores: { orderBy: { criterion: { code: "asc" } } },
      },
      orderBy: { role: "asc" },
    }),
    prisma.criterion.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.roleWeightConfig.findMany({ where: { periodId } }),
    prisma.roleCriterionConfig.findMany({ where: { periodId } }),
    prisma.finalScore.findUnique({ where: { periodId_evaluateeId: { periodId, evaluateeId } } }),
  ]);

  if (!period || !evaluatee) notFound();

  // Build weight maps for client
  const roleWeights: Record<string, number> = Object.fromEntries(
    roleWeightConfigs.map(r => [r.role, r.upperWeight])
  );
  const criterionWeights: Record<string, Record<string, number>> = {};
  for (const c of criterionConfigs) {
    criterionWeights[c.role] ??= {};
    criterionWeights[c.role][c.criterionId] = c.weight;
  }

  const evaluatorData = evaluations.map(ev => ({
    evaluationId: ev.id,
    role: ev.role,
    evaluatorName: ev.evaluator.name,
    status: ev.status,
    scores: ev.scores.map(s => ({ criterionId: s.criterionId, score: s.score, comment: s.comment })),
  }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        <Link href="/calibration" className="hover:text-gray-600">Calibration</Link>
        <span>/</span>
        <Link href={`/calibration/${periodId}`} className="hover:text-gray-600">{period.name}</Link>
        <span>/</span>
        <span>{evaluatee.name}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{evaluatee.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {evaluatee.functionalArea?.name ?? "—"}
          {evaluatee.squad ? ` · ${evaluatee.squad.name}` : ""}
          {" · "}{period.name}
        </p>
        <p className="text-xs text-blue-600 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 inline-block">
          Calibration mode — edit criterion scores to adjust the weighted suggestion score.
        </p>
      </div>

      <CalibrationScoreEditor
        criteria={criteria}
        evaluators={evaluatorData}
        periodId={periodId}
        evaluateeId={evaluateeId}
        roleWeights={roleWeights}
        criterionWeights={criterionWeights}
        existingFinalScore={finalScore?.finalScore ?? null}
      />
    </div>
  );
}
