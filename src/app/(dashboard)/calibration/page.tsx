import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TribePeriodStatus } from "@prisma/client";

const TRIBE_STATUS_LABELS: Record<TribePeriodStatus, string> = {
  PENDING: "Pending", ACTIVE: "Scoring Open", CALIBRATION: "Calibration", CLOSED: "Closed",
};
const TRIBE_STATUS_COLORS: Record<TribePeriodStatus, string> = {
  PENDING: "bg-gray-100 text-gray-500", ACTIVE: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700", CLOSED: "bg-gray-100 text-gray-400",
};

export default async function CalibrationPage() {
  let auth: Awaited<ReturnType<typeof requireAdminOrHRPartner>>;
  try { auth = await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  // For HR Partners: show periods where their tribe is in CALIBRATION
  // For Admins: show all periods in CALIBRATION or SCORING_OPEN
  const tribePeriods = await prisma.tribePeriod.findMany({
    where: {
      status: "CALIBRATION",
      ...(auth.isAdmin ? {} : { tribeId: { in: auth.hrTribeIds } }),
    },
    select: { periodId: true },
  });
  const periodIds = [...new Set(tribePeriods.map(t => t.periodId))];

  const periods = await prisma.period.findMany({
    where: { id: { in: periodIds } },
    orderBy: { createdAt: "desc" },
    include: {
      tribePeriods: auth.isAdmin ? false : {
        where: { tribeId: { in: auth.hrTribeIds } },
        select: { status: true },
      },
    },
  });

  if (periods.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Calibration</h1>
        <p className="text-sm text-gray-500 mb-8">Review and finalize evaluation scores.</p>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
          {auth.isAdmin
            ? "No active calibration periods."
            : "No tribes in Calibration yet. Move a tribe to Calibration from the Periods page."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Calibration</h1>
      <p className="text-sm text-gray-500 mb-8">Review and finalize evaluation scores.</p>

      <div className="space-y-3">
        {periods.map(p => {
          const tribeStatus = !auth.isAdmin && p.tribePeriods && p.tribePeriods.length > 0
            ? p.tribePeriods[0].status
            : null;

          return (
            <Link key={p.id} href={`/calibration/${p.id}`}
              className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-purple-300 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{p.name}</h2>
                {tribeStatus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Your tribe:</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRIBE_STATUS_COLORS[tribeStatus]}`}>
                      {TRIBE_STATUS_LABELS[tribeStatus]}
                    </span>
                  </div>
                ) : (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>
                    {p.status.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
