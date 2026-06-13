import { requireAdminOrHRPartner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  SCORING_OPEN: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700",
  DISTINCTION: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-400",
};

export default async function CalibrationPage() {
  let auth: Awaited<ReturnType<typeof requireAdminOrHRPartner>>;
  try { auth = await requireAdminOrHRPartner(); } catch { redirect("/dashboard"); }

  // Show periods in CALIBRATION or SCORING_OPEN (HR partner can start calibrating early)
  const periods = await prisma.period.findMany({
    where: { status: { in: ["SCORING_OPEN", "CALIBRATION"] } },
    orderBy: { createdAt: "desc" },
  });

  if (periods.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Calibration</h1>
        <p className="text-sm text-gray-500 mb-8">Review and finalize evaluation scores.</p>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
          No active calibration periods.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Calibration</h1>
      <p className="text-sm text-gray-500 mb-8">Review and finalize evaluation scores.</p>

      <div className="space-y-3">
        {periods.map(p => (
          <Link key={p.id} href={`/calibration/${p.id}`}
            className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-purple-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{p.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                {p.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
