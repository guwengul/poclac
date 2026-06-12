"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PeriodStatus } from "@prisma/client";

type Person = { id: string; name: string; email: string; chapter: string | null };
type Assignment = {
  id: string; role: string;
  evaluatee: { id: string; name: string };
  evaluator: { id: string; name: string };
};

const ROLES = ["PO", "CL", "AC"] as const;
const ROLE_LABELS = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };

export function AssignmentManager({
  periodId, people, assignments, periodStatus,
}: {
  periodId: string;
  people: Person[];
  assignments: Assignment[];
  periodStatus: PeriodStatus;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ evaluateeId: "", evaluatorId: "", role: "PO" as typeof ROLES[number] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const locked = periodStatus !== "DRAFT";

  // Group assignments by evaluatee
  const byEvaluatee: Record<string, { person: { id: string; name: string }; roles: Record<string, string> }> = {};
  for (const a of assignments) {
    if (!byEvaluatee[a.evaluatee.id]) {
      byEvaluatee[a.evaluatee.id] = { person: a.evaluatee, roles: {} };
    }
    byEvaluatee[a.evaluatee.id].roles[a.role] = a.evaluator.name;
  }

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId, ...form }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm((f) => ({ ...f, evaluateeId: "", evaluatorId: "" }));
    router.refresh();
  }

  async function remove(evaluateeId: string, role: string) {
    await fetch("/api/admin/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId, evaluateeId, role }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Evaluator Assignments</h2>

      {/* Assignment form */}
      {!locked && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Assign Evaluator</h3>
          <form onSubmit={assign} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Evaluatee (who is scored)</label>
              <select value={form.evaluateeId}
                onChange={(e) => setForm((f) => ({ ...f, evaluateeId: e.target.value }))}
                required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white">
                <option value="">Select person...</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof ROLES[number] }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]} ({r})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Evaluator (who scores)</label>
              <select value={form.evaluatorId}
                onChange={(e) => setForm((f) => ({ ...f, evaluatorId: e.target.value }))}
                required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white">
                <option value="">Select person...</option>
                {people.filter((p) => p.id !== form.evaluateeId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full" style={{ background: "var(--primary)" }}>
                {loading ? "Saving..." : "Assign"}
              </Button>
            </div>
          </form>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {locked && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          Assignments are locked — period is no longer in Draft status.
        </div>
      )}

      {/* Assignment table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Evaluatee</th>
              {ROLES.map((r) => (
                <th key={r} className="text-left px-4 py-3 font-medium text-gray-600">
                  {r} <span className="text-gray-400 font-normal text-xs">({ROLE_LABELS[r]})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.values(byEvaluatee).map(({ person, roles }) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{person.name}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-4 py-3">
                    {roles[r] ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{roles[r]}</span>
                        {!locked && (
                          <button onClick={() => remove(person.id, r)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">Not assigned</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {Object.keys(byEvaluatee).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
