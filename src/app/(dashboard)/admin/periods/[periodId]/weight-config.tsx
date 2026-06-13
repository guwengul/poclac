"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Criterion = { id: string; code: string; name: string };
const ROLES = ["PO", "CL", "AC"] as const;
const ROLE_LABELS = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };

type RoleWeights = Record<string, number>; // role → %
type CriterionWeights = Record<string, Record<string, number>>; // role → criterionId → %

function defaultRoleWeights() {
  return { PO: 50, CL: 30, AC: 20 };
}
function defaultCriterionWeights(criteria: Criterion[]) {
  const perRole: CriterionWeights = {};
  for (const role of ROLES) {
    perRole[role] = {};
    const equal = criteria.length > 0 ? Math.floor(100 / criteria.length) : 0;
    criteria.forEach((c, i) => {
      perRole[role][c.id] = i === criteria.length - 1
        ? 100 - equal * (criteria.length - 1)
        : equal;
    });
  }
  return perRole;
}

export function WeightConfig({
  periodId,
  criteria,
  initialRoleWeights,
  initialCriterionWeights,
}: {
  periodId: string;
  criteria: Criterion[];
  initialRoleWeights: { role: string; upperWeight: number }[];
  initialCriterionWeights: { role: string; criterionId: string; weight: number; isActive: boolean }[];
}) {
  const router = useRouter();

  const [roleWeights, setRoleWeights] = useState<RoleWeights>(() => {
    if (initialRoleWeights.length > 0) {
      return Object.fromEntries(initialRoleWeights.map(r => [r.role, r.upperWeight]));
    }
    return defaultRoleWeights();
  });

  const [criterionWeights, setCriterionWeights] = useState<CriterionWeights>(() => {
    if (initialCriterionWeights.length > 0) {
      const m: CriterionWeights = {};
      for (const r of ROLES) m[r] = {};
      for (const c of initialCriterionWeights) {
        m[c.role] = m[c.role] ?? {};
        m[c.role][c.criterionId] = c.weight;
      }
      return m;
    }
    return defaultCriterionWeights(criteria);
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const roleTotal = Object.values(roleWeights).reduce((s, v) => s + (Number(v) || 0), 0);

  function setRoleWeight(role: string, val: string) {
    setRoleWeights(w => ({ ...w, [role]: Number(val) || 0 }));
    setSaved(false);
  }

  function setCriterionWeight(role: string, criterionId: string, val: string) {
    setCriterionWeights(w => ({
      ...w,
      [role]: { ...w[role], [criterionId]: Number(val) || 0 },
    }));
    setSaved(false);
  }

  function criterionTotal(role: string) {
    return Object.values(criterionWeights[role] ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
  }

  async function save() {
    setError(""); setSaving(true);

    const rolePayload = ROLES.map(r => ({ role: r, upperWeight: Number(roleWeights[r]) || 0 }));
    const criterionPayload = ROLES.flatMap(r =>
      criteria.map(c => ({
        role: r,
        criterionId: c.id,
        weight: Number(criterionWeights[r]?.[c.id]) || 0,
        isActive: (Number(criterionWeights[r]?.[c.id]) || 0) > 0,
      }))
    );

    const res = await fetch(`/api/admin/periods/${periodId}/weights`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleWeights: rolePayload, criterionWeights: criterionPayload }),
    });

    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Error"); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Scoring Weights</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Set role weights (must sum to 100) and criterion weights per role. Weight = 0 hides that criterion from the scoring form.
        </p>
      </div>

      <div className="p-5 space-y-6">
        {/* Role weights */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role Weights</p>
            <span className={`text-xs font-medium ${Math.abs(roleTotal - 100) > 0.01 ? "text-red-500" : "text-green-600"}`}>
              Total: {roleTotal}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map(role => (
              <div key={role}>
                <label className="block text-xs text-gray-500 mb-1">{role} — {ROLE_LABELS[role]}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="100" step="1"
                    value={roleWeights[role] ?? 0}
                    onChange={e => setRoleWeight(role, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Criterion weights per role */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Criterion Weights per Role</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Criterion</th>
                  {ROLES.map(r => (
                    <th key={r} className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">
                      {r}
                      <div className={`text-xs font-normal mt-0.5 ${Math.abs(criterionTotal(r) - 100) > 0.01 && criterionTotal(r) !== 0 ? "text-red-500" : "text-gray-400"}`}>
                        {criterionTotal(r)}%
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {criteria.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">
                      {c.code} <span className="font-normal text-gray-500">{c.name}</span>
                    </td>
                    {ROLES.map(r => {
                      const val = criterionWeights[r]?.[c.id] ?? 0;
                      return (
                        <td key={r} className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number" min="0" max="100" step="1"
                              value={val}
                              onChange={e => setCriterionWeight(r, c.id, e.target.value)}
                              className={`w-16 rounded border px-2 py-1 text-xs text-center outline-none focus:border-purple-500 ${
                                val === 0 ? "border-gray-200 bg-gray-50 text-gray-300" : "border-gray-300"
                              }`}
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                          {val === 0 && (
                            <p className="text-xs text-gray-300 mt-0.5">hidden</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <Button onClick={save} disabled={saving} style={{ background: "var(--primary)" }}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Weights"}
        </Button>
      </div>
    </div>
  );
}
