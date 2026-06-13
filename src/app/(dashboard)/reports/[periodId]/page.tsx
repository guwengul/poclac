import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

const ROLES = ["PO", "CL", "AC"] as const;

function calcStars(people: { id: string; finalScore: number }[], highPct: number, distPct: number) {
  const sorted = [...people].sort((a, b) => b.finalScore - a.finalScore);
  const n = sorted.length;
  const highCount = Math.floor(n * highPct);
  const distCount = Math.floor(n * distPct);
  const map = new Map<string, string>();
  sorted.forEach((p, i) => {
    if (i < highCount) map.set(p.id, "⭐⭐");
    else if (i < highCount + distCount) map.set(p.id, "⭐");
    else map.set(p.id, "");
  });
  return map;
}

export default async function ReportPeriodPage({
  params,
}: { params: Promise<{ periodId: string }> }) {
  let auth: Awaited<ReturnType<typeof requireAdminOrHRPartner>>;
  try { auth = await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  const { periodId } = await params;

  const [period, tribes, finalScores, evaluations, criteria, distinctionConfig] = await Promise.all([
    prisma.period.findUnique({ where: { id: periodId } }),
    prisma.tribe.findMany({
      where: auth.isAdmin ? {} : { id: { in: auth.hrTribeIds } },
      include: {
        tribePeriods: { where: { periodId }, select: { status: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.finalScore.findMany({
      where: { periodId },
      select: { evaluateeId: true, finalScore: true },
    }),
    prisma.evaluation.findMany({
      where: { periodId, status: "SUBMITTED" },
      select: {
        evaluateeId: true, role: true,
        scores: { select: { score: true, criterionId: true } },
      },
    }),
    prisma.criterion.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.distinctionConfig.findUnique({ where: { periodId } }),
  ]);

  if (!period) notFound();

  const highPct = distinctionConfig?.highPct ?? 0.1;
  const distPct = distinctionConfig?.distPct ?? 0.1;

  const finalScoreMap = new Map(finalScores.map(f => [f.evaluateeId, f.finalScore]));

  // Fetch all evaluatees grouped by tribe
  const tribeEvaluatees = await prisma.person.findMany({
    where: {
      evaluateeAssignments: { some: { periodId } },
      OR: [
        { squad: { tribeId: { in: tribes.map(t => t.id) } } },
        { functionalArea: { tribeId: { in: tribes.map(t => t.id) } } },
      ],
    },
    select: {
      id: true, name: true,
      squad: { select: { tribeId: true } },
      functionalArea: { select: { tribeId: true } },
    },
  });

  // Group evaluatees by tribe
  const byTribe = new Map<string, typeof tribeEvaluatees>();
  for (const p of tribeEvaluatees) {
    const tribeId = p.squad?.tribeId ?? p.functionalArea?.tribeId;
    if (!tribeId) continue;
    if (!byTribe.has(tribeId)) byTribe.set(tribeId, []);
    byTribe.get(tribeId)!.push(p);
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        <Link href="/reports" className="hover:text-gray-600">← Reports</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{period.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date(period.startDate).toLocaleDateString()} — {new Date(period.endDate).toLocaleDateString()}
      </p>

      <div className="space-y-8">
        {tribes.map(tribe => {
          const tribeStatus = tribe.tribePeriods[0]?.status;
          const people = byTribe.get(tribe.id) ?? [];
          const withScores = people
            .filter(p => finalScoreMap.has(p.id))
            .map(p => ({ id: p.id, name: p.name, finalScore: finalScoreMap.get(p.id)! }));

          const stars = calcStars(withScores, highPct, distPct);
          const ranked = [...withScores].sort((a, b) => b.finalScore - a.finalScore);

          // Role averages from submitted evaluations for this tribe's evaluatees
          const tribeEvaluateeIds = new Set(people.map(p => p.id));
          const tribeEvals = evaluations.filter(e => tribeEvaluateeIds.has(e.evaluateeId));

          const roleAvg: Record<string, number | null> = {};
          for (const role of ROLES) {
            const scores = tribeEvals
              .filter(e => e.role === role)
              .flatMap(e => e.scores.map(s => s.score));
            roleAvg[role] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
          }

          // Criterion averages
          const critAvg: Record<string, number | null> = {};
          for (const c of criteria) {
            const scores = tribeEvals.flatMap(e => e.scores.filter(s => s.criterionId === c.id).map(s => s.score));
            critAvg[c.id] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
          }

          const hdCount = ranked.filter(p => stars.get(p.id) === "⭐⭐").length;
          const dCount = ranked.filter(p => stars.get(p.id) === "⭐").length;

          return (
            <div key={tribe.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900">{tribe.name}</h2>
                {tribeStatus && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    tribeStatus === "CLOSED" ? "bg-gray-100 text-gray-500"
                    : tribeStatus === "CALIBRATION" ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                  }`}>{tribeStatus}</span>
                )}
              </div>

              {/* Summary chips */}
              <div className="flex flex-wrap gap-3">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-gray-500">Finalized</p>
                  <p className="text-xl font-bold text-gray-900">{withScores.length}<span className="text-sm font-normal text-gray-400">/{people.length}</span></p>
                </div>
                {ROLES.map(role => (
                  <div key={role} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-gray-500">{role} avg</p>
                    <p className="text-xl font-bold text-gray-900">
                      {roleAvg[role] !== null ? roleAvg[role]!.toFixed(2) : "—"}
                    </p>
                  </div>
                ))}
                {hdCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-amber-600">⭐⭐ HD</p>
                    <p className="text-xl font-bold text-amber-700">{hdCount}</p>
                  </div>
                )}
                {dCount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-blue-600">⭐ D</p>
                    <p className="text-xl font-bold text-blue-700">{dCount}</p>
                  </div>
                )}
              </div>

              {/* Criterion averages */}
              {criteria.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {criteria.map(c => (
                    <div key={c.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center min-w-16">
                      <p className="text-xs text-gray-500">{c.code}</p>
                      <p className="text-sm font-bold text-gray-900">
                        {critAvg[c.id] !== null ? critAvg[c.id]!.toFixed(2) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Ranked list */}
              {ranked.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs w-8">#</th>
                        <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Person</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Final Score</th>
                        <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Distinction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ranked.map((p, i) => {
                        const star = stars.get(p.id) ?? "";
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                            <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-bold ${
                                star === "⭐⭐" ? "text-amber-600"
                                : star === "⭐" ? "text-blue-600"
                                : "text-gray-700"
                              }`}>{p.finalScore.toFixed(2)}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-base leading-none">{star}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-400">
                  No finalized scores yet.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
