import { getCurrentUser, getHRPartnerTribeIds } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList, CheckCircle2, Clock, Users, Building2,
  CalendarRange, Star, BarChart3, ArrowRight, PlusCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const person = await getCurrentUser();
  if (!person) redirect("/auth/login");

  const hrTribeIds = person.isAdmin
    ? (await prisma.tribe.findMany({ select: { id: true } })).map(t => t.id)
    : await getHRPartnerTribeIds(person.id);
  const isManager = person.isAdmin || hrTribeIds.length > 0;

  // Active scoring periods
  const openPeriods = await prisma.period.findMany({
    where: { status: "SCORING_OPEN" },
    select: { id: true, name: true, scoringDeadline: true },
  });

  // My pending evaluations
  const myAssignments = await prisma.evaluatorAssignment.findMany({
    where: { evaluatorId: person.id, period: { status: "SCORING_OPEN" } },
    include: {
      evaluatee: { select: { name: true } },
      period: { select: { id: true, name: true, scoringDeadline: true } },
    },
  });

  const evaluationStatuses = await prisma.evaluation.findMany({
    where: { evaluatorId: person.id, period: { status: "SCORING_OPEN" } },
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

  // Tribe progress for managers
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
        tribeStats.push({ name: tribe.name, periodName: period.name, total: tribeAssignments.length, submitted: submittedCount });
      }
    }
  }

  // Quick actions per role
  const adminActions = [
    { href: "/admin/periods", icon: PlusCircle, label: "Periyot Oluştur", desc: "Yeni değerlendirme dönemi başlat", color: "purple" },
    { href: "/admin/users", icon: Users, label: "Kişileri Yönet", desc: "Çalışan ekle, rol ata", color: "blue" },
    { href: "/admin/organization", icon: Building2, label: "Organizasyon", desc: "Tribe, squad, alan yapılandır", color: "indigo" },
  ];
  const hrActions = [
    { href: "/admin/periods", icon: CalendarRange, label: "Periyotlar", desc: "Tribe'ını aktifleştir veya calibration'a al", color: "purple" },
    { href: "/calibration", icon: Star, label: "Calibration", desc: "Skorları gözden geçir ve finalleştir", color: "blue" },
    { href: "/reports", icon: BarChart3, label: "Raporlar", desc: "Tribe sonuçlarını ve distinction'ları gör", color: "green" },
  ];
  const evaluatorActions = [
    { href: "/evaluations", icon: ClipboardList, label: "Değerlendirmelerim", desc: "Bekleyen değerlendirmelerini tamamla", color: "purple" },
  ];

  const quickActions = person.isAdmin ? adminActions : hrTribeIds.length > 0 ? hrActions : evaluatorActions;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hoş geldin, {person.name} 👋</h1>
        <p className="text-sm text-gray-400 mt-1">Bugün ne yapmak istersin?</p>
      </div>

      {/* Quick Actions — always visible */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Hızlı Erişim</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href}
              className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition-all flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                action.color === "purple" ? "bg-purple-50 text-purple-600"
                : action.color === "blue" ? "bg-blue-50 text-blue-600"
                : action.color === "indigo" ? "bg-indigo-50 text-indigo-600"
                : "bg-green-50 text-green-600"
              }`}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">{action.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 mt-0.5 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Period content */}
      {openPeriods.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-400">
          Şu an aktif bir değerlendirme dönemi yok.
          {person.isAdmin && (
            <div className="mt-3">
              <Link href="/admin/periods"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: "var(--primary)" }}>
                <PlusCircle className="w-3.5 h-3.5" />
                Periyot Oluştur
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* My evaluations summary */}
          {myAssignments.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Değerlendirmelerim</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Toplam" value={myAssignments.length} color="purple" />
                <StatCard icon={<Clock className="w-5 h-5" />} label="Bekleyen" value={pending.length} color={pending.length > 0 ? "orange" : "gray"} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Tamamlanan" value={submitted} color="green" />
              </div>
            </div>
          )}

          {/* Pending list */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bekleyenler</h2>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {pending.map((a) => (
                  <div key={`${a.periodId}:${a.evaluateeId}:${a.role}`}
                    className="flex items-center justify-between px-5 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{a.evaluatee.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{a.role} · {a.period.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        Son {new Date(a.period.scoringDeadline).toLocaleDateString("tr-TR")}
                      </span>
                      <Link href="/evaluations"
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                        style={{ background: "var(--primary)" }}>
                        Başla →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tribe progress */}
          {isManager && tribeStats.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tribe İlerlemesi</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tribeStats.map((t, i) => {
                  const pct = t.total === 0 ? 0 : Math.round((t.submitted / t.total) * 100);
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{t.periodName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "var(--primary)" }} />
                        </div>
                        <span className="text-xs text-gray-500 w-20 text-right">
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
  icon: React.ReactNode; label: string; value: number;
  color: "purple" | "orange" | "green" | "gray";
}) {
  const colors = { purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600", green: "bg-green-50 text-green-600", gray: "bg-gray-50 text-gray-400" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
