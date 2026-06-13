"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

type DistinctionCategory = "HIGH_DISTINCTION" | "DISTINCTION" | "NORMAL";

type PersonRow = {
  id: string;
  name: string;
  finalScore: number;
  existingCategory?: DistinctionCategory;
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

function Stars({ category }: { category: DistinctionCategory }) {
  if (category === "HIGH_DISTINCTION") return <span className="text-amber-400 text-base leading-none">⭐⭐</span>;
  if (category === "DISTINCTION") return <span className="text-amber-400 text-base leading-none">⭐</span>;
  return null;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = isClosed && people.some(p => p.existingCategory)
    ? new Map(people.map(p => [p.id, p.existingCategory ?? "NORMAL"]))
    : calcCategories(people);

  const sorted = [...people].sort((a, b) => b.finalScore - a.finalScore);
  const n = people.length;
  const highCount = Math.floor(n * 0.1);
  const distCount = Math.floor(n * 0.1);

  async function finalize() {
    setSaving(true); setError("");
    const distinctions = sorted.map(p => ({
      evaluateeId: p.id,
      category: categories.get(p.id) ?? "NORMAL",
    }));
    const res = await fetch(`/api/calibration/${periodId}/distinctions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tribeId, distinctions, closeTribe: true }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Error"); return; }
    router.refresh();
  }

  if (people.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Distinction — {tribeName}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Top {highCount} ⭐⭐ High Distinction · Next {distCount} ⭐ Distinction · {n - highCount - distCount} Normal
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs w-8">#</th>
            <th className="text-left px-5 py-2.5 font-medium text-gray-600 text-xs">Person</th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Final Score</th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Distinction</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((p, i) => {
            const cat = categories.get(p.id) ?? "NORMAL";
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-bold ${
                    cat === "HIGH_DISTINCTION" ? "text-amber-600"
                    : cat === "DISTINCTION" ? "text-blue-600"
                    : "text-gray-700"
                  }`}>{p.finalScore.toFixed(2)}</span>
                </td>
                <td className="px-4 py-3 text-center h-10">
                  <Stars category={cat} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!isClosed ? (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {error ? <p className="text-xs text-red-600">{error}</p> : <span />}
          <button
            onClick={finalize}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
            style={{ background: "var(--primary)" }}>
            <Lock className="w-3 h-3" />
            {saving ? "Closing..." : "Finalize & Close Tribe"}
          </button>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          Tribe period closed.
        </div>
      )}
    </div>
  );
}
