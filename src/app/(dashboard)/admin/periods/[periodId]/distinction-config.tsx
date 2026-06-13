"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DistinctionConfigPanel({
  periodId,
  initialHighPct,
  initialDistPct,
}: {
  periodId: string;
  initialHighPct: number;
  initialDistPct: number;
}) {
  const router = useRouter();
  const [highPct, setHighPct] = useState(initialHighPct);
  const [distPct, setDistPct] = useState(initialDistPct);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const total = (Number(highPct) || 0) + (Number(distPct) || 0);

  async function save() {
    setError(""); setSaving(true);
    const res = await fetch(`/api/admin/periods/${periodId}/distinction-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highPct: Number(highPct), distPct: Number(distPct) }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Error"); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Distinction Thresholds</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Percentage of tribe members to receive each distinction. Applied per tribe, rounded down.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">⭐⭐ High Distinction %</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="100" step="1"
                value={highPct}
                onChange={e => { setHighPct(Number(e.target.value)); setSaved(false); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">⭐ Distinction %</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="100" step="1"
                value={distPct}
                onChange={e => { setDistPct(Number(e.target.value)); setSaved(false); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
        </div>
        <p className={`text-xs ${total > 100 ? "text-red-500" : "text-gray-400"}`}>
          Combined: {total}% — remaining {Math.max(0, 100 - total)}% Normal
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={save}
          disabled={saving || total > 100}
          className="text-xs font-medium px-4 py-2 rounded-lg text-white disabled:opacity-40"
          style={{ background: "var(--primary)" }}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}
