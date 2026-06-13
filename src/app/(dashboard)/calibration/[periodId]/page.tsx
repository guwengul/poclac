import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };

export default async function CalibrationPeriodPage({
  params,
}: { params: Promise<{ periodId: string }> }) {
  let auth: Awaited<ReturnType<typeof requireAdminOrHRPartner>>;
  try { auth = await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  const { periodId } = await params;

  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period) notFound();

  // Get all evaluatees that have at least one submitted evaluation in this period
  // filtered by HR partner's tribes
  const tribeFilter = auth.isAdmin
    ? {}
    : {
        OR: [
          { squad: { tribeId: { in: auth.hrTribeIds } } },
          { functionalArea: { tribeId: { in: auth.hrTribeIds } } },
        ],
      };

  const evaluatees = await prisma.person.findMany({
    where: {
      evaluateeAssignments: { some: { periodId } },
      ...tribeFilter,
    },
    select: {
      id: true, name: true,
      functionalArea: { select: { name: true } },
      squad: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  // Get all evaluations for these evaluatees
  const evaluations = await prisma.evaluation.findMany({
    where: { periodId, evaluateeId: { in: evaluatees.map(e => e.id) } },
    select: { evaluateeId: true, role: true, status: true },
  });

  // Get final scores
  const finalScores = await prisma.finalScore.findMany({
    where: { periodId, evaluateeId: { in: evaluatees.map(e => e.id) } },
    select: { evaluateeId: true, finalScore: true },
  });
  const finalScoreMap = new Map(finalScores.map(f => [f.evaluateeId, f.finalScore]));

  // Group evals by evaluatee
  const evalMap = new Map<string, { role: string; status: string }[]>();
  for (const e of evaluations) {
    if (!evalMap.has(e.evaluateeId)) evalMap.set(e.evaluateeId, []);
    evalMap.get(e.evaluateeId)!.push({ role: e.role, status: e.status });
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
        <Link href="/calibration" className="hover:text-gray-600">← Calibration</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{period.name}</h1>
      <p className="text-sm text-gray-500 mb-6">Click a person to review and finalize their scores.</p>

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
                      {(["PO", "CL", "AC"] as const).map(role => {
                        const ev = evals.find(e => e.role === role);
                        return (
                          <span key={role}
                            title={ROLE_LABELS[role]}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              ev?.status === "SUBMITTED"
                                ? "bg-green-100 text-green-700"
                                : ev
                                ? "bg-yellow-100 text-yellow-700"
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
                        <span className="font-semibold text-gray-900">
                          {finalScoreMap.get(person.id)?.toFixed(2)}
                        </span>
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
            {evaluatees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                  No evaluatees found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
