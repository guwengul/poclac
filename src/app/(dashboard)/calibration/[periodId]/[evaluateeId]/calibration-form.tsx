"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

export function CalibrationForm({
  periodId,
  evaluateeId,
  suggestionScore,
  existingFinalScore,
  existingJustification,
}: {
  periodId: string;
  evaluateeId: string;
  suggestionScore: number | null;
  existingFinalScore: number | null;
  existingJustification: string | null;
}) {
  const router = useRouter();
  const [finalScore, setFinalScore] = useState(
    existingFinalScore !== null ? String(existingFinalScore) : ""
  );
  const [justification, setJustification] = useState(existingJustification ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function useSuggestion() {
    if (suggestionScore !== null) {
      setFinalScore(suggestionScore.toFixed(2));
      setSaved(false);
    }
  }

  async function save() {
    const score = parseFloat(finalScore);
    if (isNaN(score) || score < 1 || score > 5) {
      setError("Final score must be between 1 and 5.");
      return;
    }
    setSaving(true); setError("");
    const res = await fetch(`/api/calibration/${periodId}/${evaluateeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalScore: score, justification }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Error saving"); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">Final Score</h2>

      {suggestionScore !== null && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 mb-4">
          <Lightbulb className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-purple-800">
              Suggestion score: <strong>{suggestionScore.toFixed(2)}</strong>
              <span className="text-purple-500 ml-1 text-xs">(average of all submitted evaluations)</span>
            </span>
          </div>
          <button
            onClick={useSuggestion}
            className="text-xs font-medium text-purple-700 hover:text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors">
            Use this
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Final Score (1.00 – 5.00)</label>
          <input
            type="number"
            min="1" max="5" step="0.01"
            value={finalScore}
            onChange={e => { setFinalScore(e.target.value); setSaved(false); }}
            placeholder="e.g. 3.50"
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Justification <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={justification}
            onChange={e => { setJustification(e.target.value); setSaved(false); }}
            rows={3}
            placeholder="Explain the reasoning behind this final score..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving} style={{ background: "var(--primary)" }}>
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Final Score"}
          </Button>
        </div>
      </div>
    </div>
  );
}
