import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EvaluationStartButton } from "./evaluation-start-button";

export default async function EvaluationsPage() {
  const person = await getCurrentUser();
  if (!person) redirect("/auth/login");

  // Find all SCORING_OPEN periods
  const periods = await prisma.period.findMany({
    where: { status: "SCORING_OPEN" },
    select: { id: true, name: true, scoringDeadline: true },
  });

  const periodIds = periods.map((p) => p.id);

  // My assignments as evaluator
  const assignments = periodIds.length > 0
    ? await prisma.evaluatorAssignment.findMany({
        where: { evaluatorId: person.id, periodId: { in: periodIds } },
        include: {
          evaluatee: { select: { id: true, name: true, chapter: true } },
          period: { select: { id: true, name: true, scoringDeadline: true } },
        },
        orderBy: [{ period: { name: "asc" } }, { evaluatee: { name: "asc" } }],
      })
    : [];

  // Existing evaluations
  const existingEvals = periodIds.length > 0
    ? await prisma.evaluation.findMany({
        where: { evaluatorId: person.id, periodId: { in: periodIds } },
        select: { id: true, periodId: true, evaluateeId: true, role: true, status: true },
      })
    : [];

  const evalMap: Record<string, typeof existingEvals[0]> = {};
  for (const e of existingEvals) {
    evalMap[`${e.periodId}-${e.evaluateeId}-${e.role}`] = e;
  }

  // Past evaluations from last 3 closed periods
  const pastEvals = await prisma.evaluation.findMany({
    where: {
      evaluatorId: person.id,
      status: "SUBMITTED",
      period: { status: "CLOSED" },
    },
    include: {
      evaluatee: { select: { name: true } },
      period: { select: { name: true, endDate: true } },
      scores: { select: { score: true } },
    },
    orderBy: { period: { endDate: "desc" } },
    take: 9,
  });

  const ROLE_LABELS: Record<string, string> = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Evaluations</h1>
      <p className="text-sm text-gray-500 mb-8">
        People you need to evaluate in open periods.
      </p>

      {assignments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          No evaluations assigned to you in open periods.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Person</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Your Role</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Deadline</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a) => {
                const key = `${a.periodId}-${a.evaluateeId}-${a.role}`;
                const ev = evalMap[key];
                const status = ev?.status ?? "NOT_STARTED";

                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{a.evaluatee.name}</p>
                      {a.evaluatee.chapter && (
                        <p className="text-xs text-gray-400">{a.evaluatee.chapter}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                        {a.role}
                      </span>
                      <span className="ml-1.5 text-xs text-gray-400">{ROLE_LABELS[a.role]}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{a.period.name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(a.period.scoringDeadline).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      {ev ? (
                        <Link
                          href={`/evaluations/${ev.id}`}
                          className="text-sm font-medium text-purple-600 hover:text-purple-800"
                        >
                          {status === "SUBMITTED" ? "View" : "Continue →"}
                        </Link>
                      ) : (
                        <EvaluationStartButton
                          periodId={a.periodId}
                          evaluateeId={a.evaluateeId}
                          role={a.role}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Past evaluations */}
      {pastEvals.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Past Evaluations</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Person</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Avg. Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pastEvals.map((e) => {
                  const avg = e.scores.length > 0
                    ? e.scores.reduce((s, sc) => s + sc.score, 0) / e.scores.length
                    : null;
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{e.evaluatee.name}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          {e.role}
                        </span>
                        <span className="ml-1.5 text-xs text-gray-400">{ROLE_LABELS[e.role]}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{e.period.name}</td>
                      <td className="px-5 py-3 text-right">
                        {avg !== null ? (
                          <span className="font-semibold text-gray-700">{avg.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
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

function StatusBadge({ status }: { status: string }) {
  if (status === "SUBMITTED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Submitted
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
      Not Started
    </span>
  );
}
