"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, Check, X } from "lucide-react";
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
  // editing: key = "evaluateeId:role", value = selected evaluatorId
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const locked = periodStatus !== "DRAFT";

  // Group assignments by evaluatee
  const byEvaluatee: Record<string, { person: { id: string; name: string }; roles: Record<string, { evaluatorId: string; name: string }> }> = {};
  for (const a of assignments) {
    if (!byEvaluatee[a.evaluatee.id]) {
      byEvaluatee[a.evaluatee.id] = { person: a.evaluatee, roles: {} };
    }
    byEvaluatee[a.evaluatee.id].roles[a.role] = { evaluatorId: a.evaluator.id, name: a.evaluator.name };
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

  async function saveEdit(evaluateeId: string, role: string) {
    const key = `${evaluateeId}:${role}`;
    const evaluatorId = editing[key];
    if (!evaluatorId) return;
    setSaving(key);
    // Upsert: POST with same evaluatee+role will overwrite
    await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId, evaluateeId, evaluatorId, role }),
    });
    setSaving(null);
    setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    router.refresh();
  }

  function startEdit(evaluateeId: string, role: string, currentEvaluatorId: string) {
    setEditing(e => ({ ...e, [`${evaluateeId}:${role}`]: currentEvaluatorId }));
  }

  function cancelEdit(evaluateeId: string, role: string) {
    setEditing(e => { const n = { ...e }; delete n[`${evaluateeId}:${role}`]; return n; });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Evaluator Assignments</h2>

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
              <tr key={person.id} className="hover:bg-gray-50 group">
                <td className="px-5 py-3 font-medium text-gray-900">{person.name}</td>
                {ROLES.map((r) => {
                  const current = roles[r];
                  const editKey = `${person.id}:${r}`;
                  const isEditing = editKey in editing;
                  const isSaving = saving === editKey;

                  return (
                    <td key={r} className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editing[editKey]}
                            onChange={ev => setEditing(e => ({ ...e, [editKey]: ev.target.value }))}
                            className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-purple-500 bg-white min-w-0 flex-1"
                          >
                            <option value="">— remove —</option>
                            {people.filter(p => p.id !== person.id).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button onClick={() => saveEdit(person.id, r)}
                            disabled={isSaving}
                            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => cancelEdit(person.id, r)}
                            className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : current ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700">{current.name}</span>
                          {!locked && (
                            <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                              <button onClick={() => startEdit(person.id, r, current.evaluatorId)}
                                className="p-0.5 text-gray-300 hover:text-blue-500 transition-colors">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => remove(person.id, r)}
                                className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">Not assigned</span>
                      )}
                    </td>
                  );
                })}
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
