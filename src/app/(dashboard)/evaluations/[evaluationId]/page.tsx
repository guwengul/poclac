import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ScoringForm } from "./scoring-form";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const person = await getCurrentUser();
  if (!person) redirect("/auth/login");

  const { evaluationId } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      evaluatee: { select: { id: true, name: true, chapter: true } },
      period: { select: { id: true, name: true, status: true, scoringDeadline: true } },
      scores: { include: { criterion: { select: { id: true, code: true, name: true, description: true } } } },
    },
  });

  if (!evaluation) notFound();
  if (evaluation.evaluatorId !== person.id) redirect("/evaluations");

  // Only fetch criteria active for this role in this period
  const criterionConfigs = await prisma.roleCriterionConfig.findMany({
    where: {
      periodId: evaluation.periodId,
      role: evaluation.role,
      isActive: true,
      weight: { gt: 0 },
    },
    include: { criterion: true },
    orderBy: { criterion: { code: "asc" } },
  });

  // Fall back to all active criteria if no weights configured yet
  const allCriteria = await prisma.criterion.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  const criteria = criterionConfigs.length > 0
    ? criterionConfigs.map(c => ({ ...c.criterion, weight: c.weight }))
    : allCriteria.map(c => ({ ...c, weight: null }));

  const ROLE_LABELS: Record<string, string> = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <span>My Evaluations</span>
          <span>/</span>
          <span>{evaluation.evaluatee.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{evaluation.evaluatee.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your role: <span className="font-medium text-gray-700">{ROLE_LABELS[evaluation.role]} ({evaluation.role})</span>
          {" · "}
          Period: <span className="font-medium text-gray-700">{evaluation.period.name}</span>
          {" · "}
          Deadline: <span className="font-medium text-gray-700">
            {new Date(evaluation.period.scoringDeadline).toLocaleDateString("en-GB")}
          </span>
        </p>
      </div>

      {evaluation.period.status !== "SCORING_OPEN" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          This period is no longer open for scoring.
        </div>
      ) : (
        <ScoringForm
          evaluationId={evaluation.id}
          evaluatee={evaluation.evaluatee}
          criteria={criteria}
          existingScores={evaluation.scores.map((s) => ({ criterionId: s.criterionId, score: s.score, comment: s.comment }))}
          isSubmitted={evaluation.status === "SUBMITTED"}
        />
      )}
    </div>
  );
}
