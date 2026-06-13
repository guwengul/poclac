import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const person = await getCurrentUser();

  const isAdmin = person?.isAdmin ?? false;
  const isHRPartner = (person?.tribeHRPartners?.length ?? 0) > 0;

  const initials = (person?.name ?? user.email ?? "?")
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  const roleBadge = isAdmin ? "Admin" : isHRPartner ? "HR Partner" : "Evaluator";

  return (
    <div className="flex h-screen" style={{ background: "var(--background)" }}>
      <Sidebar userEmail={user.email ?? ""} isAdmin={isAdmin} isHRPartner={isHRPartner} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-5 w-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Performance Evaluation & Calibration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isAdmin ? "bg-purple-100 text-purple-700"
              : isHRPartner ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
            }`}>{roleBadge}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: "var(--primary)" }}>
              {initials}
            </div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">
              {person?.name ?? user.email}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
