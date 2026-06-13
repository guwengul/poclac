import { prisma } from "@/lib/prisma";
import { EvaluatorRole } from "@prisma/client";

/**
 * Calculates the weighted suggestion score for an evaluatee in a period.
 * Formula:
 *   1. For each submitted evaluation: weighted average of criterion scores
 *      (using RoleCriterionConfig weights; falls back to equal weight if none configured)
 *   2. Combine evaluator scores using RoleWeightConfig weights
 *      (falls back to equal weight if none configured)
 */
export async function calcSuggestionScore(
  periodId: string,
  evaluateeId: string
): Promise<number | null> {
  const [evaluations, roleWeightConfigs, criterionConfigs] = await Promise.all([
    prisma.evaluation.findMany({
      where: { periodId, evaluateeId, status: "SUBMITTED" },
      include: { scores: true },
    }),
    prisma.roleWeightConfig.findMany({ where: { periodId } }),
    prisma.roleCriterionConfig.findMany({ where: { periodId } }),
  ]);

  if (evaluations.length === 0) return null;

  // Build lookup maps
  const roleWeightMap = new Map(roleWeightConfigs.map(r => [r.role, r.upperWeight]));
  const criterionWeightMap = new Map(
    criterionConfigs.map(c => [`${c.role}:${c.criterionId}`, c.weight])
  );

  // Calculate weighted score per evaluator role
  const roleScores: { role: EvaluatorRole; score: number; weight: number }[] = [];

  for (const ev of evaluations) {
    if (ev.scores.length === 0) continue;

    // Get criterion weights for this role
    const scoredCriteria = ev.scores.map(s => ({
      criterionId: s.criterionId,
      score: s.score,
      weight: criterionWeightMap.get(`${ev.role}:${s.criterionId}`) ?? null,
    }));

    let evalScore: number;
    const hasWeights = scoredCriteria.some(s => s.weight !== null && s.weight > 0);

    if (hasWeights) {
      // Weighted average — only include criteria with weight > 0
      const active = scoredCriteria.filter(s => (s.weight ?? 0) > 0);
      if (active.length === 0) continue;
      const totalWeight = active.reduce((s, c) => s + (c.weight ?? 0), 0);
      evalScore = active.reduce((s, c) => s + c.score * (c.weight ?? 0), 0) / totalWeight;
    } else {
      // Equal weight fallback
      evalScore = ev.scores.reduce((s, c) => s + c.score, 0) / ev.scores.length;
    }

    const roleWeight = roleWeightMap.get(ev.role) ?? null;
    roleScores.push({ role: ev.role, score: evalScore, weight: roleWeight ?? 0 });
  }

  if (roleScores.length === 0) return null;

  const hasRoleWeights = roleScores.some(r => r.weight > 0);

  if (hasRoleWeights) {
    const totalWeight = roleScores.reduce((s, r) => s + r.weight, 0);
    return roleScores.reduce((s, r) => s + r.score * r.weight, 0) / totalWeight;
  } else {
    return roleScores.reduce((s, r) => s + r.score, 0) / roleScores.length;
  }
}
