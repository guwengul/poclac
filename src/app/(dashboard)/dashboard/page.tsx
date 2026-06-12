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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Ana Sayfa</h1>
      <p className="text-sm text-gray-500 mb-8">
        Hoşgeldiniz{person ? `, ${person.name}` : ""}.
      </p>

      {!person && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Hesabınız henüz sisteme eklenmemiş. Sistem yöneticisiyle iletişime geçin.
        </div>
      )}
    </div>
  );
}
