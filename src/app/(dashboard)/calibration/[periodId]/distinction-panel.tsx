"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, User, Lock } from "lucide-react";

type DistinctionCategory = "HIGH_DISTINCTION" | "DISTINCTION" | "NORMAL";

type PersonRow = {
  id: string;
  name: string;
  finalScore: number;
  existingCategory?: DistinctionCategory;
};

const CATEGORY_CONFIG: Record<DistinctionCategory, { label: string; color: string; icon: React.ReactNode }> = {
  HIGH_DISTINCTION: {
    label: "High Distinction",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Trophy className="w-3 h-3" />,
  },
  DISTINCTION: {
    label: "Distinction",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <Star className="w-3 h-3" />,
  },
  NORMAL: {
    label: "Normal",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <User className="w-3 h-3" />,
  },
};

function calcCategories(people: PersonRow[]): Map<string, DistinctionCategory> {
  const sorted = [...people].sort((a, b) => b.finalScore - a.finalScore);
  const n = sorted.length;
  const highCount = Math.floor(n * 0.1);
  const distCount = Math.floor(n * 0.1);

  const map = new Map<string, DistinctionCategory>();
  sorted.forEach((p, i) => {
    if (i < highCount) map.set(p.id, "HIGH_DISTINCTION");
    else if (i < highCount + distCount) map.set(p.id, "DISTINCTION");
    else map.set(p.id, "NORMAL");
  });
  return map;
}

export function DistinctionPanel({
  periodId,
  tribeId,
  tribeName,
  people,
  isClosed,
}: {
  periodId: string;
  tribeId: string;
  tribeName: string;
  people: PersonRow[];
  isClosed: boolean;
}) {
  const router = useRouter();
  const hasExisting = people.some(p => p.existingCategory);

  const [categories, setCategories] = useState<Map<string, DistinctionCategory>>(() => {
    if (hasExisting) {
      const m = new Map<string, DistinctionCategory>();
      for (const p of people) {
        if (p.existingCategory) m.set(p.id, p.existingCategory);
      }
      return m;
    }
    return calcCategories(people);
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(hasExisting);
  const [error, setError] = useState("");

  const sorted = [...people].sort((a, b) => b.finalScore - a.finalScore);
  const n = people.length;
  const highCount = Math.floor(n * 0.1);
  const distCount = Math.floor(n * 0.1);

  function resetToAuto() {
    setCategories(calcCategories(people));
    setSaved(false);
  }

  function toggleCategory(personId: string) {
    if (isClosed) return;
    setCategories(prev => {
      const current = prev.get(personId) ?? "NORMAL";
      const next: DistinctionCategory =
        current === "NORMAL" ? "DISTINCTION"
        : current === "DISTINCTION" ? "HIGH_DISTINCTION"
        : "NORMAL";
      const m = new Map(prev);
      m.set(personId, next);
      return m;
    });
    setSaved(false);
  }

  async function save(close: boolean) {
    setSaving(true); setError("");
    const distinctions = sorted.map(p => ({
      evaluateeId: p.id,
      category: categories.get(p.id) ?? "NORMAL",
    }));
    const res = await fetch(`/api/calibration/${periodId}/distinctions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tribeId, distinctions, closeTribe: close }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Error"); return; }
    setSaved(true);
    router.refresh();
  }

  if (people.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Distinction — {tribeName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Auto-calculated: top {highCount} High Distinction, next {distCount} Distinction.
            {!isClosed && " Click a row to cycle through categories."}
          </p>
        </div>
        {!isClosed && (
          <button onClick={resetToAuto} className="text-xs text-purple-500 hover:text-purple-700">
            Reset to auto
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs w-8">#</th>
            <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Person</th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Final Score</th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Category</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((p, i) => {
            const cat = categories.get(p.id) ?? "NORMAL";
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <tr
                key={p.id}
                onClick={() => toggleCategory(p.id)}
                className={`${!isClosed ? "cursor-pointer hover:bg-gray-50" : ""} transition-colors`}
              >
                <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-bold ${
                    cat === "HIGH_DISTINCTION" ? "text-amber-700"
                    : cat === "DISTINCTION" ? "text-blue-700"
                    : "text-gray-700"
                  }`}>{p.finalScore.toFixed(2)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!isClosed && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save Draft"}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
              style={{ background: "var(--primary)" }}>
              <Lock className="w-3 h-3" />
              {saving ? "Closing..." : "Finalize & Close Tribe"}
            </button>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          Tribe period closed — distinctions locked.
        </div>
      )}
    </div>
  );
}
