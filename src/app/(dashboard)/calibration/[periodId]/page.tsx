import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };
const ROLES = ["PO", "CL", "AC"] as const;

export default async function CalibrationPeriodPage({
  params,
}: { params: Promise<{ periodId: string }> }) {
  let auth: Awaited<ReturnType<typeof requireAdminOrHRPartner>>;
  try { auth = await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  const { periodId } = await params;
  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period) notFound();

  const calibrationTribeIds = auth.isAdmin
    ? (await prisma.tribePeriod.findMany({ where: { periodId, status: "CALIBRATION" }, select: { tribeId: true } })).map(t => t.tribeId)
    : (await prisma.tribePeriod.findMany({ where: { periodId, status: "CALIBRATION", tribeId: { in: auth.hrTribeIds } }, select: { tribeId: true } })).map(t => t.tribeId);

  const activeTribeIds = auth.isAdmin
    ? (await prisma.tribePeriod.findMany({ where: { periodId, status: "ACTIVE" }, select: { tribeId: true } })).map(t => t.tribeId)
    : [];

  const visibleTribeIds = [...calibrationTribeIds, ...activeTribeIds];

  const [evaluatees, allEvaluations, finalScores, criteria] = await Promise.all([
    prisma.person.findMany({
      where: {
        evaluateeAssignments: { some: { periodId } },
        OR: [
          { squad: { tribeId: { in: visibleTribeIds } } },
          { functionalArea: { tribeId: { in: visibleTribeIds } } },
        ],
      },
      select: { id: true, name: true, functionalArea: { select: { name: true } }, squad: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.evaluation.findMany({
      where: { periodId },
      include: {
        evaluator: { select: { id: true, name: true } },
        scores: { include: { criterion: { select: { id: true, code: true, name: true } } } },
      },
    }),
    prisma.finalScore.findMany({
      where: { periodId },
      select: { evaluateeId: true, finalScore: true },
    }),
    prisma.criterion.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
  ]);

  const evaluateeIds = new Set(evaluatees.map(e => e.id));
  const evaluations = allEvaluations.filter(e => evaluateeIds.has(e.evaluateeId));

  const finalScoreMap = new Map(finalScores.map(f => [f.evaluateeId, f.finalScore]));
  const evalMap = new Map<string, typeof evaluations>();
  for (const e of evaluations) {
    if (!evalMap.has(e.evaluateeId)) evalMap.set(e.evaluateeId, []);
    evalMap.get(e.evaluateeId)!.push(e);
  }

  // Stats: per evaluator (role) — how many submitted, avg score given
  const byRole: Record<string, { submitted: number; total: number; avgScore: number | null }> = {};
  for (const role of ROLES) {
    const roleEvals = evaluations.filter(e => e.role === role);
    const submitted = roleEvals.filter(e => e.status === "SUBMITTED");
    const allScores = submitted.flatMap(e => e.scores.map(s => s.score));
    byRole[role] = {
      total: roleEvals.length,
      submitted: submitted.length,
      avgScore: allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null,
    };
  }

  // Stats: per criterion — avg score per role
  const byCriterion: Record<string, Record<string, number | null>> = {};
  for (const c of criteria) {
    byCriterion[c.id] = {};
    for (const role of ROLES) {
      const scores = evaluations
        .filter(e => e.role === role && e.status === "SUBMITTED")
        .flatMap(e => e.scores.filter(s => s.criterion.id === c.id).map(s => s.score));
      byCriterion[c.id][role] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    }
  }

  const totalFinalized = evaluatees.filter(e => finalScoreMap.has(e.id)).length;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        <Link href="/calibration" className="hover:text-gray-600">← Calibration</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{period.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Click a person to review and finalize their scores.</p>

      {evaluatees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
          No tribes are in Calibration status yet. Move a tribe to Calibration from the Periods page.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall + role stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Finalized</p>
              <p className="text-2xl font-bold text-gray-900">{totalFinalized}<span className="text-sm font-normal text-gray-400">/{evaluatees.length}</span></p>
            </div>
            {ROLES.map(role => (
              <div key={role} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{role} <span className="text-gray-400">submissions</span></p>
                <p className="text-2xl font-bold text-gray-900">
                  {byRole[role].submitted}<span className="text-sm font-normal text-gray-400">/{byRole[role].total}</span>
                </p>
                {byRole[role].avgScore !== null && (
                  <p className="text-xs text-purple-500 mt-0.5">avg {byRole[role].avgScore!.toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>

          {/* Criterion stats */}
          {criteria.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Average Score by Criterion & Role</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Criterion</th>
                    {ROLES.map(r => (
                      <th key={r} className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">{r}</th>
                    ))}
                    <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Overall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {criteria.map(c => {
                    const allScores = evaluations
                      .filter(e => e.status === "SUBMITTED")
                      .flatMap(e => e.scores.filter(s => s.criterion.id === c.id).map(s => s.score));
                    const overall = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-medium text-gray-800 text-xs">
                          {c.code} <span className="font-normal text-gray-500">{c.name}</span>
                        </td>
                        {ROLES.map(r => {
                          const avg = byCriterion[c.id][r];
                          return (
                            <td key={r} className="px-4 py-2.5 text-center">
                              {avg !== null ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  avg >= 4 ? "bg-green-100 text-green-700"
                                  : avg <= 2 ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                                }`}>{avg.toFixed(2)}</span>
                              ) : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2.5 text-center">
                          {overall !== null ? (
                            <span className="text-xs font-bold text-purple-700">{overall.toFixed(2)}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* People list */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Person</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Area / Squad</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Evaluations</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Final Score</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {evaluatees.map(person => {
                  const evals = evalMap.get(person.id) ?? [];
                  const hasFinal = finalScoreMap.has(person.id);
                  return (
                    <tr key={person.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{person.name}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {person.functionalArea?.name ?? "—"}
                        {person.squad ? ` · ${person.squad.name}` : ""}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {ROLES.map(role => {
                            const ev = evals.find(e => e.role === role);
                            return (
                              <span key={role} title={ROLE_LABELS[role]}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  ev?.status === "SUBMITTED" ? "bg-green-100 text-green-700"
                                  : ev ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-400"
                                }`}>
                                {role}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {hasFinal ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-semibold text-gray-900">{finalScoreMap.get(person.id)?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Circle className="w-4 h-4 text-gray-300" />
                            <span className="text-gray-400 text-xs">Not finalized</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/calibration/${periodId}/${person.id}`}
                          className="text-xs font-medium text-purple-600 hover:text-purple-800">
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
