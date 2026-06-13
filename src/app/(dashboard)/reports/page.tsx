import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  SCORING_OPEN: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700",
  DISTINCTION: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

export default async function ReportsPage() {
  let auth: Awaited<ReturnType<typeof requireAdminOrHRPartner>>;
  try { auth = await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  const periods = await prisma.period.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tribePeriods: {
        where: auth.isAdmin ? {} : { tribeId: { in: auth.hrTribeIds } },
        select: { status: true, tribeId: true },
      },
      finalScores: { select: { evaluateeId: true } },
    },
  });

  const visiblePeriods = auth.isAdmin
    ? periods
    : periods.filter(p => p.tribePeriods.length > 0);

  if (visiblePeriods.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
        <p className="text-sm text-gray-500 mb-8">Period summaries and final scores.</p>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
          No periods available yet.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-6">Select a period to view results.</p>

      <div className="space-y-3">
        {visiblePeriods.map(p => {
          const finalized = p.finalScores.length;
          const tribeStatuses = [...new Set(p.tribePeriods.map(t => t.status))];
          return (
            <Link key={p.id} href={`/reports/${p.id}`}
              className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-purple-300 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{p.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {finalized > 0 && (
                    <span className="text-xs text-gray-500">{finalized} finalized</span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              {tribeStatuses.length > 0 && !auth.isAdmin && (
                <p className="text-xs text-gray-400 mt-1">
                  Your tribe: {tribeStatuses.join(", ")}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
