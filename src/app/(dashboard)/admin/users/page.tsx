import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AddUserForm } from "./add-user-form";
import { GrantLoginButton } from "./grant-login-button";
import { PersonActions } from "./person-actions";

export default async function UsersPage() {
  try { await requireAdmin(); } catch { redirect("/dashboard"); }

  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, email: true, name: true,
      isActive: true, isAdmin: true, hasLogin: true,
      functionalArea: { select: { name: true } },
      squad: { select: { name: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">People</h1>
      <p className="text-sm text-gray-500 mb-8">
        Add everyone first — assign them to squads and functional areas in the Organization page.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <AddUserForm />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">People ({people.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Area / Squad</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Access</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {people.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{p.email}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {p.functionalArea?.name
                        ? <span>{p.functionalArea.name}{p.squad ? ` · ${p.squad.name}` : ""}</span>
                        : <span className="text-gray-300 italic">Not assigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      {p.isAdmin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Admin</span>
                      ) : p.hasLogin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Login</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">No login</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {!p.hasLogin && !p.isAdmin && (
                          <GrantLoginButton personId={p.id} personName={p.name} />
                        )}
                        <PersonActions person={{ id: p.id, name: p.name, email: p.email, isAdmin: p.isAdmin }} />
                      </div>
                    </td>
                  </tr>
                ))}
                {people.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                      No people added yet.
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
