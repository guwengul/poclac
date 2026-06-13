import { getCurrentUser, getHRPartnerTribeIds } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, CheckCircle2, Clock, Users, Building2 } from "lucide-react";

export default async function DashboardPage() {
  const person = await getCurrentUser();
  if (!person) redirect("/auth/login");

  // Active scoring periods
  const openPeriods = await prisma.period.findMany({
    where: { status: "SCORING_OPEN" },
    select: { id: true, name: true, scoringDeadline: true },
  });

  // My pending evaluations
  const myAssignments = await prisma.evaluatorAssignment.findMany({
    where: {
      evaluatorId: person.id,
      period: { status: "SCORING_OPEN" },
    },
    include: {
      evaluatee: { select: { name: true } },
      period: { select: { id: true, name: true, scoringDeadline: true } },
      // Check if evaluation exists + status
    },
  });

  const evaluationStatuses = await prisma.evaluation.findMany({
    where: {
      evaluatorId: person.id,
      period: { status: "SCORING_OPEN" },
    },
    select: { evaluateeId: true, periodId: true, role: true, status: true },
  });

  const submittedKeys = new Set(
    evaluationStatuses
      .filter(e => e.status === "SUBMITTED")
      .map(e => `${e.periodId}:${e.evaluateeId}:${e.role}`)
  );

  const pending = myAssignments.filter(
    a => !submittedKeys.has(`${a.periodId}:${a.evaluateeId}:${a.role}`)
  );
  const submitted = myAssignments.length - pending.length;

  // HR Partner / Admin extras
  const hrTribeIds = person.isAdmin
    ? (await prisma.tribe.findMany({ select: { id: true } })).map(t => t.id)
    : await getHRPartnerTribeIds(person.id);
  const isManager = person.isAdmin || hrTribeIds.length > 0;

  let tribeStats: { name: string; total: number; submitted: number; periodName: string }[] = [];
  if (isManager && openPeriods.length > 0) {
    const periodIds = openPeriods.map(p => p.id);
    const assignments = await prisma.evaluatorAssignment.findMany({
      where: {
        periodId: { in: periodIds },
        evaluatee: {
          OR: [
            { squad: { tribeId: { in: hrTribeIds } } },
            { functionalArea: { tribeId: { in: hrTribeIds } } },
          ],
        },
      },
      select: {
        periodId: true, evaluateeId: true, role: true,
        evaluatee: { select: { squad: { select: { tribeId: true } }, functionalArea: { select: { tribeId: true } } } },
      },
    });

    const evals = await prisma.evaluation.findMany({
      where: { periodId: { in: periodIds }, status: "SUBMITTED" },
      select: { periodId: true, evaluateeId: true, role: true },
    });
    const submittedSet = new Set(evals.map(e => `${e.periodId}:${e.evaluateeId}:${e.role}`));

    // Group by tribe
    const tribes = await prisma.tribe.findMany({
      where: { id: { in: hrTribeIds } },
      select: { id: true, name: true },
    });

    for (const tribe of tribes) {
      for (const period of openPeriods) {
        const tribeAssignments = assignments.filter(a =>
          a.periodId === period.id &&
          (a.evaluatee.squad?.tribeId === tribe.id || a.evaluatee.functionalArea?.tribeId === tribe.id)
        );
        if (tribeAssignments.length === 0) continue;
        const submittedCount = tribeAssignments.filter(
          a => submittedSet.has(`${a.periodId}:${a.evaluateeId}:${a.role}`)
        ).length;
        tribeStats.push({
          name: tribe.name,
          periodName: period.name,
          total: tribeAssignments.length,
          submitted: submittedCount,
        });
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {person.name}</h1>
      <p className="text-sm text-gray-500 mb-8">Performance Evaluation & Calibration Platform</p>

      {openPeriods.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
          No active scoring period right now.
        </div>
      ) : (
        <div className="space-y-6">
          {/* My evaluations summary */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Evaluations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<ClipboardList className="w-5 h-5" />}
                label="Total assigned"
                value={myAssignments.length}
                color="purple"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Pending"
                value={pending.length}
                color={pending.length > 0 ? "orange" : "gray"}
              />
              <StatCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Submitted"
                value={submitted}
                color="green"
              />
            </div>
          </div>

          {/* Pending evaluations list */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending</h2>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {pending.map((a) => (
                  <div key={`${a.periodId}:${a.evaluateeId}:${a.role}`}
                    className="flex items-center justify-between px-5 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{a.evaluatee.name}</span>
                      <span className="ml-2 text-xs text-gray-400">as {a.role} · {a.period.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        Due {new Date(a.period.scoringDeadline).toLocaleDateString("en-GB")}
                      </span>
                      <Link href="/evaluations"
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
                        style={{ background: "var(--primary)" }}>
                        Start →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tribe progress (HR Partner / Admin) */}
          {isManager && tribeStats.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tribe Progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tribeStats.map((t, i) => {
                  const pct = t.total === 0 ? 0 : Math.round((t.submitted / t.total) * 100);
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{t.periodName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "var(--primary)" }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-16 text-right">
                          {t.submitted}/{t.total} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "purple" | "orange" | "green" | "gray";
}) {
  const colors = {
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    gray: "bg-gray-50 text-gray-400",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
