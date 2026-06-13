import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreatePeriodForm } from "./create-period-form";
import { PeriodStatus, TribePeriodStatus } from "@prisma/client";

const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  DRAFT: "Draft", SCORING_OPEN: "Scoring Open", CALIBRATION: "Calibration",
  DISTINCTION: "Distinction", CLOSED: "Closed",
};
const PERIOD_STATUS_COLORS: Record<PeriodStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600", SCORING_OPEN: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700", DISTINCTION: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-500",
};
const TRIBE_STATUS_LABELS: Record<TribePeriodStatus, string> = {
  PENDING: "Pending", ACTIVE: "Scoring Open", CALIBRATION: "Calibration", CLOSED: "Closed",
};
const TRIBE_STATUS_COLORS: Record<TribePeriodStatus, string> = {
  PENDING: "bg-gray-100 text-gray-500", ACTIVE: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700", CLOSED: "bg-gray-100 text-gray-400",
};

export default async function PeriodsPage() {
  let isAdmin = false;
  let hrTribeIds: string[] = [];
  try { ({ isAdmin, hrTribeIds } = await requireAdminOrHRPartner()); } catch { redirect("/dashboard"); }

  const periods = await prisma.period.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evaluations: true } },
      tribePeriods: isAdmin ? false : {
        where: { tribeId: { in: hrTribeIds } },
        select: { status: true, tribeId: true },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Periods</h1>
      <p className="text-sm text-gray-500 mb-8">Manage evaluation periods and assignments.</p>

      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? "lg:grid-cols-3" : ""}`}>
        {isAdmin && (
          <div className="lg:col-span-1">
            <CreatePeriodForm />
          </div>
        )}

        <div className={`space-y-3 ${isAdmin ? "lg:col-span-2" : ""}`}>
          {periods.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
              No periods yet. Create one to get started.
            </div>
          )}

          {periods.map((p) => {
            // HR Partner: show their tribe's status instead of global
            const tribeStatus = !isAdmin && p.tribePeriods && p.tribePeriods.length > 0
              ? p.tribePeriods[0].status
              : null;

            return (
              <Link key={p.id} href={`/admin/periods/${p.id}`}
                className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">{p.name}</h2>
                  <div className="flex items-center gap-2">
                    {tribeStatus ? (
                      <>
                        <span className="text-xs text-gray-400">Your tribe:</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRIBE_STATUS_COLORS[tribeStatus]}`}>
                          {TRIBE_STATUS_LABELS[tribeStatus]}
                        </span>
                      </>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PERIOD_STATUS_COLORS[p.status]}`}>
                        {PERIOD_STATUS_LABELS[p.status]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Scoring deadline: {new Date(p.scoringDeadline).toLocaleDateString()}</span>
                  <span>Calibration: {new Date(p.calibrationDeadline).toLocaleDateString()}</span>
                  <span>{p._count.evaluations} evaluations</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
