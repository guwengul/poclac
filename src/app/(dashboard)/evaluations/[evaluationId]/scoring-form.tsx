"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Criterion = { id: string; code: string; name: string; description: string | null };

const SCORE_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Developing",
  3: "Meeting Expectations",
  4: "Exceeding",
  5: "Outstanding",
};

export function ScoringForm({
  evaluationId,
  evaluatee,
  criteria,
  existingScores,
  isSubmitted,
}: {
  evaluationId: string;
  evaluatee: { id: string; name: string; chapter: string | null };
  criteria: Criterion[];
  existingScores: { criterionId: string; score: number; comment: string | null }[];
  isSubmitted: boolean;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const s of existingScores) m[s.criterionId] = s.score;
    return m;
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const s of existingScores) if (s.comment) m[s.criterionId] = s.comment;
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const allScored = criteria.every((c) => scores[c.id] !== undefined);

  function setScore(criterionId: string, score: number) {
    setScores((s) => ({ ...s, [criterionId]: score }));
    setSaved(false);
  }

  function setComment(criterionId: string, comment: string) {
    setComments((c) => ({ ...c, [criterionId]: comment }));
    setSaved(false);
  }

  function buildPayload() {
    return Object.entries(scores).map(([criterionId, score]) => ({
      criterionId,
      score,
      comment: comments[criterionId] ?? null,
    }));
  }

  async function saveDraft() {
    setSaving(true); setError("");
    const res = await fetch(`/api/evaluations/${evaluationId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: buildPayload() }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setSaved(true);
  }

  async function submit() {
    if (!allScored) { setError("Please score all criteria before submitting."); return; }
    setSaving(true); setError("");
    const saveRes = await fetch(`/api/evaluations/${evaluationId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: buildPayload() }),
    });
    setSaving(false);
    if (!saveRes.ok) { setError((await saveRes.json()).error); return; }

    setSubmitting(true);
    const res = await fetch(`/api/evaluations/${evaluationId}/submit`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    router.push("/evaluations");
    router.refresh();
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800 font-medium">
          ✓ Evaluation submitted. Your scores are locked.
        </div>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {criteria.map((c) => (
            <div key={c.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{c.code} — {c.name}</p>
                  {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                </div>
                <ScoreDisplay score={scores[c.id]} />
              </div>
              {comments[c.id] && (
                <p className="mt-2 text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">
                  {comments[c.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        Blind scoring is active — your scores are private until calibration begins.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {criteria.map((c) => (
          <div key={c.id} className="px-5 py-5">
            <div className="mb-3">
              <p className="font-semibold text-gray-900">{c.code} — {c.name}</p>
              {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
            </div>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(c.id, n)}
                  title={SCORE_LABELS[n]}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all",
                    scores[c.id] === n
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-gray-200 text-gray-500 hover:border-purple-400 hover:text-purple-600"
                  )}
                >
                  {n}
                </button>
              ))}
              {scores[c.id] !== undefined && (
                <span className="ml-2 self-center text-xs text-gray-400">
                  {SCORE_LABELS[scores[c.id]]}
                </span>
              )}
            </div>
            <textarea
              value={comments[c.id] ?? ""}
              onChange={(e) => setComment(c.id, e.target.value)}
              placeholder="Add a comment (optional)..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-purple-400 resize-none"
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={saveDraft} disabled={saving || submitting}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Draft"}
        </Button>
        <Button
          onClick={submit}
          disabled={saving || submitting || !allScored}
          style={{ background: "var(--primary)" }}
        >
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </Button>
        {!allScored && (
          <span className="self-center text-xs text-gray-400">
            {criteria.filter((c) => scores[c.id] === undefined).length} criteria remaining
          </span>
        )}
      </div>
    </div>
  );
}

function ScoreDisplay({ score }: { score: number | undefined }) {
  if (!score) return <span className="text-gray-300 text-sm">—</span>;
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="w-8 h-8 rounded-lg bg-purple-600 text-white text-sm font-bold flex items-center justify-center">
        {score}
      </span>
      <span className="text-xs text-gray-400">{SCORE_LABELS[score]}</span>
    </div>
  );
}
