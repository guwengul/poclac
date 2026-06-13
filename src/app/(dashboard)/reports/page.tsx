import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  try { await requireAdmin(); } catch { redirect("/dashboard"); }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-8">Period summaries and final scores.</p>
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
        Coming soon — available after calibration is complete.
      </div>
    </div>
  );
}
