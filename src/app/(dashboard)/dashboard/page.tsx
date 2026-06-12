import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const person = user
    ? await prisma.person.findUnique({ where: { email: user.email! } })
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome{person ? `, ${person.name}` : ""}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Performance Evaluation &amp; Calibration Platform
      </p>

      {!person && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Your account has not been added to the system yet. Please contact your administrator.
        </div>
      )}
    </div>
  );
}
