"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

type Criterion = { id: string; code: string; name: string };
type EvalScore = { criterionId: string; score: number; comment: string | null };
type Evaluator = {
  evaluationId: string;
  role: string;
  evaluatorName: string;
  status: string;
  scores: EvalScore[];
};

const SCORE_LABELS: Record<number, string> = {
  1: "Needs Improvement", 2: "Developing", 3: "Meeting Expectations",
  4: "Exceeding", 5: "Outstanding",
};
const ROLE_LABELS: Record<string, string> = { PO: "Product Owner", CL: "Chapter Lead", AC: "Agile Coach" };

export function CalibrationScoreEditor({
  criteria,
  evaluators: initialEvaluators,
  periodId,
  evaluateeId,
  roleWeights,
  criterionWeights,
  existingFinalScore,
}: {
  criteria: Criterion[];
  evaluators: Evaluator[];
  periodId: string;
  evaluateeId: string;
  roleWeights: Record<string, number>;
  criterionWeights: Record<string, Record<string, number>>;
  existingFinalScore: number | null;
}) {
  const router = useRouter();
  const [evaluators, setEvaluators] = useState(initialEvaluators);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(existingFinalScore);
  const [finalizing, setFinalizing] = useState(false);

  function hasChanges(ev: Evaluator) {
    const orig = initialEvaluators.find(e => e.evaluationId === ev.evaluationId);
    if (!orig) return false;
    return ev.scores.some(s => {
      const origScore = orig.scores.find(o => o.criterionId === s.criterionId)?.score;
      return origScore !== s.score;
    });
  }

  function revertEvaluator(evaluationId: string) {
    const orig = initialEvaluators.find(e => e.evaluationId === evaluationId);
    if (!orig) return;
    setEvaluators(evs => evs.map(ev => ev.evaluationId !== evaluationId ? ev : { ...ev, scores: orig.scores.map(s => ({ ...s })) }));
    setSaved(null);
  }

  function getScore(ev: Evaluator, criterionId: string) {
    return ev.scores.find(s => s.criterionId === criterionId)?.score ?? null;
  }

  function setScore(evaluationId: string, criterionId: string, score: number) {
    setEvaluators(evs => evs.map(ev =>
      ev.evaluationId !== evaluationId ? ev : {
        ...ev,
        scores: ev.scores.some(s => s.criterionId === criterionId)
          ? ev.scores.map(s => s.criterionId === criterionId ? { ...s, score } : s)
          : [...ev.scores, { criterionId, score, comment: null }],
      }
    ));
    setSaved(null);
  }

  async function saveEvaluator(ev: Evaluator) {
    setSaving(ev.evaluationId);
    await fetch(`/api/evaluations/${ev.evaluationId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scores: ev.scores.map(s => ({ criterionId: s.criterionId, score: s.score, comment: s.comment })),
      }),
    });
    setSaving(null);
    setSaved(ev.evaluationId);
  }

  // Weighted average for one evaluator
  function evalWeightedScore(ev: Evaluator): number | null {
    const cwMap = criterionWeights[ev.role] ?? {};
    const hasWeights = Object.values(cwMap).some(w => w > 0);
    const scored = ev.scores.filter(s => s.score > 0);
    if (scored.length === 0) return null;

    if (hasWeights) {
      const active = scored.filter(s => (cwMap[s.criterionId] ?? 0) > 0);
      if (active.length === 0) return null;
      const totalW = active.reduce((s, c) => s + (cwMap[c.criterionId] ?? 0), 0);
      return active.reduce((s, c) => s + c.score * (cwMap[c.criterionId] ?? 0), 0) / totalW;
    }
    return scored.reduce((s, c) => s + c.score, 0) / scored.length;
  }

  // Combined suggestion score
  function suggestionScore(): number | null {
    const roleScores = evaluators
      .filter(ev => ev.status === "SUBMITTED")
      .map(ev => ({ score: evalWeightedScore(ev), weight: roleWeights[ev.role] ?? 0, role: ev.role }))
      .filter(r => r.score !== null) as { score: number; weight: number; role: string }[];

    if (roleScores.length === 0) return null;
    const hasWeights = roleScores.some(r => r.weight > 0);
    if (hasWeights) {
      const total = roleScores.reduce((s, r) => s + r.weight, 0);
      return roleScores.reduce((s, r) => s + r.score * r.weight, 0) / total;
    }
    return roleScores.reduce((s, r) => s + r.score, 0) / roleScores.length;
  }

  const suggestion = suggestionScore();

  async function finalize() {
    if (suggestion === null) return;
    setFinalizing(true);
    const res = await fetch(`/api/calibration/${periodId}/${evaluateeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalScore: suggestion, justification: null }),
    });
    setFinalizing(false);
    if (res.ok) {
      setFinalScore(suggestion);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Suggestion score banner */}
      <div className={`border rounded-xl px-5 py-4 flex items-center justify-between ${finalScore !== null ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-100"}`}>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${finalScore !== null ? "text-green-600" : "text-purple-500"}`}>
            {finalScore !== null ? "Finalized Score" : "Suggestion Score"}
          </p>
          <p className={`text-3xl font-bold mt-0.5 ${finalScore !== null ? "text-green-800" : "text-purple-800"}`}>
            {finalScore !== null ? finalScore.toFixed(2) : suggestion !== null ? suggestion.toFixed(2) : "—"}
          </p>
          <p className={`text-xs mt-0.5 ${finalScore !== null ? "text-green-500" : "text-purple-400"}`}>
            {finalScore !== null ? "Locked · calibration complete" : "Weighted average · updates as scores change"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right text-xs text-purple-400 space-y-1">
            {evaluators.filter(ev => ev.status === "SUBMITTED").map(ev => {
              const s = evalWeightedScore(ev);
              const w = roleWeights[ev.role];
              return (
                <div key={ev.evaluationId}>
                  <span className="font-medium text-purple-600">{ev.role}</span>
                  {" "}({w !== undefined ? `${w}%` : "equal"})
                  {" = "}{s !== null ? s.toFixed(2) : "—"}
                </div>
              );
            })}
          </div>
          {finalScore === null ? (
            <button
              onClick={finalize}
              disabled={finalizing || suggestion === null}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-40"
              style={{ background: "var(--primary)" }}>
              <Lock className="w-3 h-3" />
              {finalizing ? "Finalizing..." : "Finalize Score"}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <Lock className="w-3 h-3" />
              Finalized
            </div>
          )}
        </div>
      </div>

      {/* Score table per evaluator */}
      {evaluators.map(ev => (
        <div key={ev.evaluationId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800">{ev.role}</span>
              <span className="text-gray-400 ml-2 text-sm">— {ROLE_LABELS[ev.role]}</span>
              <span className="ml-3 text-sm text-gray-600">{ev.evaluatorName}</span>
            </div>
            <div className="flex items-center gap-2">
              {ev.status !== "SUBMITTED" && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Not submitted</span>
              )}
              {ev.status === "SUBMITTED" && finalScore === null && hasChanges(ev) && (
                <button
                  onClick={() => revertEvaluator(ev.evaluationId)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                  Revert to original
                </button>
              )}
              {ev.status === "SUBMITTED" && finalScore === null && (
                <button
                  onClick={() => saveEvaluator(ev)}
                  disabled={saving === ev.evaluationId}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-40">
                  {saving === ev.evaluationId ? "Saving..." : saved === ev.evaluationId ? "Saved ✓" : "Save Changes"}
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {criteria.map(c => {
              const score = getScore(ev, c.id);
              const cw = criterionWeights[ev.role]?.[c.id];
              const isHidden = cw !== undefined && cw === 0;
              if (isHidden) return null;

              return (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-700 shrink-0">{c.code}</span>
                    <span className="text-sm text-gray-500 truncate">{c.name}</span>
                    {cw !== undefined && cw > 0 && (
                      <span className="text-xs text-purple-400 shrink-0">{cw}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {ev.status === "SUBMITTED" && finalScore === null
                      ? [1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setScore(ev.evaluationId, c.id, n)}
                            title={SCORE_LABELS[n]}
                            className={cn(
                              "w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all",
                              score === n
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-600"
                            )}>
                            {n}
                          </button>
                        ))
                      : score !== null
                        ? (
                          <span className={cn(
                            "w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center",
                            score >= 4 ? "bg-green-100 text-green-700"
                            : score <= 2 ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                          )}>{score}</span>
                        )
                        : <span className="text-gray-300 text-sm">—</span>
                    }
                    {score !== null && (
                      <span className="text-xs text-gray-400 w-36 hidden sm:block">{SCORE_LABELS[score]}</span>
                    )}
                  </div>
                  </div>
                  {/* Comment */}
                  {(() => {
                    const comment = ev.scores.find(s => s.criterionId === c.id)?.comment;
                    return comment ? (
                      <p className="mt-1 ml-1 text-xs text-gray-400 italic border-l-2 border-gray-100 pl-2">{comment}</p>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
