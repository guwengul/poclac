"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EvaluationStartButton({
  periodId, evaluateeId, role,
}: {
  periodId: string;
  evaluateeId: string;
  role: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/evaluations/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId, evaluateeId, role }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/evaluations/${data.evaluation.id}`);
    } else {
      alert(data.error ?? "Failed to start evaluation");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      className="text-sm font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50"
    >
      {loading ? "Starting..." : "Start →"}
    </button>
  );
}
