import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { AssignmentManager } from "./assignment-manager";
import { PeriodStatusManager } from "./period-status-manager";

export default async function PeriodDetailPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  try { await requireAdmin(); } catch { redirect("/dashboard"); }

  const { periodId } = await params;

  const [period, people, assignments] = await Promise.all([
    prisma.period.findUnique({
      where: { id: periodId },
      include: { roleCriterionConfigs: { include: { criterion: true } } },
    }),
    prisma.person.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, chapter: true },
      orderBy: { name: "asc" },
    }),
    prisma.evaluatorAssignment.findMany({
      where: { periodId },
      include: {
        evaluatee: { select: { id: true, name: true } },
        evaluator: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!period) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <a href="/admin/periods" className="text-sm text-gray-400 hover:text-gray-600">← Periods</a>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{period.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date(period.startDate).toLocaleDateString()} — {new Date(period.endDate).toLocaleDateString()}
      </p>

      <div className="space-y-6">
        <PeriodStatusManager period={period} />
        <AssignmentManager
          periodId={periodId}
          people={people}
          assignments={assignments}
          periodStatus={period.status}
        />
      </div>
    </div>
  );
}
