import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Reuses the same cached call if page server components also call getCurrentUser()
  const person = await getCurrentUser();

  const isAdmin = person?.isAdmin ?? false;
  const isHRPartner = (person?.tribeHRPartners?.length ?? 0) > 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userEmail={user.email ?? ""} isAdmin={isAdmin} isHRPartner={isHRPartner} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
