import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AddUserForm } from "./add-user-form";

export default async function UsersPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: { id: true, email: true, name: true, chapter: true, isActive: true, isAdmin: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Kullanıcı Yönetimi</h1>
      <p className="text-sm text-gray-500 mb-8">Sisteme kullanıcı ekle ve yönet.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AddUserForm />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Kullanıcılar ({people.length})
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Ad</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">E-posta</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Chapter</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Rol</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {people.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">{p.email}</td>
                    <td className="px-5 py-3 text-gray-600">{p.chapter ?? "—"}</td>
                    <td className="px-5 py-3">
                      {p.isAdmin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Kullanıcı
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {p.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          Pasif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {people.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                      Henüz kullanıcı eklenmemiş.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
