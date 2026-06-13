import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CalibrationForm } from "./calibration-form";

const ROLE_LABELS: Record<string, string> = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };
const SCORE_LABELS: Record<number, string> = {
  1: "Needs Improvement", 2: "Developing", 3: "Meeting Expectations", 4: "Exceeding", 5: "Outstanding",
};

export default async function CalibrationPersonPage({
  params,
}: { params: Promise<{ periodId: string; evaluateeId: string }> }) {
  try { await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  const { periodId, evaluateeId } = await params;

  const [period, evaluatee, evaluations, criteria, finalScore] = await Promise.all([
    prisma.period.findUnique({ where: { id: periodId } }),
    prisma.person.findUnique({
      where: { id: evaluateeId },
      select: { id: true, name: true, functionalArea: { select: { name: true } }, squad: { select: { name: true } } },
    }),
    prisma.evaluation.findMany({
      where: { periodId, evaluateeId },
      include: {
        evaluator: { select: { name: true } },
        scores: {
          include: { criterion: { select: { id: true, code: true, name: true } } },
          orderBy: { criterion: { code: "asc" } },
        },
      },
      orderBy: { role: "asc" },
    }),
    prisma.criterion.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.finalScore.findUnique({ where: { periodId_evaluateeId: { periodId, evaluateeId } } }),
  ]);

  if (!period || !evaluatee) notFound();

  // Calculate suggestion score: average of all submitted scores
  const submittedEvals = evaluations.filter(e => e.status === "SUBMITTED");
  let suggestionScore: number | null = null;
  if (submittedEvals.length > 0) {
    const allScores = submittedEvals.flatMap(e => e.scores.map(s => s.score));
    if (allScores.length > 0) {
      suggestionScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        <Link href="/calibration" className="hover:text-gray-600">Calibration</Link>
        <span>/</span>
        <Link href={`/calibration/${periodId}`} className="hover:text-gray-600">{period.name}</Link>
        <span>/</span>
        <span>{evaluatee.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{evaluatee.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {evaluatee.functionalArea?.name ?? "—"}
            {evaluatee.squad ? ` · ${evaluatee.squad.name}` : ""}
            {" · "}
            {period.name}
          </p>
        </div>
      </div>

      {/* Score comparison table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Score Comparison</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium text-gray-600 w-40">Criterion</th>
              {evaluations.map(ev => (
                <th key={ev.id} className="text-center px-4 py-3 font-medium text-gray-600">
                  <div>{ev.role}</div>
                  <div className="text-xs text-gray-400 font-normal">{ROLE_LABELS[ev.role]}</div>
                  <div className="text-xs font-normal mt-0.5">
                    {ev.status === "SUBMITTED" ? (
                      <span className="text-green-600">{ev.evaluator.name}</span>
                    ) : (
                      <span className="text-amber-500">{ev.evaluator.name} (draft)</span>
                    )}
                  </div>
                </th>
              ))}
              {evaluations.length === 0 && (
                <th className="px-4 py-3 text-gray-400 font-normal text-xs">No evaluations yet</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {criteria.map(criterion => (
              <tr key={criterion.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">
                  {criterion.code}
                  <span className="font-normal text-gray-500 ml-1 text-xs">{criterion.name}</span>
                </td>
                {evaluations.map(ev => {
                  const sc = ev.scores.find(s => s.criterion.id === criterion.id);
                  return (
                    <td key={ev.id} className="px-4 py-3 text-center">
                      {sc ? (
                        <div>
                          <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-sm font-bold mx-auto
                            ${sc.score >= 4 ? "bg-green-100 text-green-700" : sc.score <= 2 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                            {sc.score}
                          </span>
                          <div className="text-xs text-gray-400 mt-0.5">{SCORE_LABELS[sc.score]}</div>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {evaluations.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td className="px-5 py-3 font-semibold text-gray-700">Average</td>
                {evaluations.map(ev => {
                  const scores = ev.scores.map(s => s.score);
                  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
                  return (
                    <td key={ev.id} className="px-4 py-3 text-center font-semibold text-gray-800">
                      {avg !== null ? avg.toFixed(2) : "—"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Comments per evaluator */}
      {evaluations.some(ev => ev.scores.some(s => s.comment)) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Comments</h2>
          <div className="space-y-4">
            {evaluations.map(ev => {
              const withComments = ev.scores.filter(s => s.comment);
              if (withComments.length === 0) return null;
              return (
                <div key={ev.id}>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    {ev.role} — {ev.evaluator.name}
                  </p>
                  {withComments.map(s => (
                    <div key={s.id} className="flex gap-3 mb-1">
                      <span className="text-xs font-medium text-gray-500 w-6">{s.criterion.code}</span>
                      <p className="text-sm text-gray-600 italic">{s.comment}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final score form */}
      <CalibrationForm
        periodId={periodId}
        evaluateeId={evaluateeId}
        suggestionScore={suggestionScore}
        existingFinalScore={finalScore?.finalScore ?? null}
        existingJustification={finalScore?.justification ?? null}
      />
    </div>
  );
}
