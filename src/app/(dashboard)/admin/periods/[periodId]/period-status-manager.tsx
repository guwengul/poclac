"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeriodStatus } from "@prisma/client";

const TRANSITIONS: Record<PeriodStatus, PeriodStatus | null> = {
  DRAFT: "SCORING_OPEN",
  SCORING_OPEN: "CLOSED",
  CALIBRATION: "CLOSED",
  DISTINCTION: "CLOSED",
  CLOSED: null,
};

const NEXT_LABELS: Record<PeriodStatus, string> = {
  DRAFT: "Open Scoring",
  SCORING_OPEN: "Close Period",
  CALIBRATION: "Close Period",
  DISTINCTION: "Close Period",
  CLOSED: "",
};

const STATUS_COLORS: Record<PeriodStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCORING_OPEN: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700",
  DISTINCTION: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

export function PeriodStatusManager({ period }: { period: { id: string; status: PeriodStatus; name: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const nextStatus = TRANSITIONS[period.status];

  async function advance() {
    if (!nextStatus) return;
    setLoading(true);
    await fetch(`/api/admin/periods/${period.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[period.status]}`}>
          {period.status.replace("_", " ")}
        </span>
      </div>
      {nextStatus && (
        <Button onClick={advance} disabled={loading} style={{ background: "var(--primary)" }}>
          {loading ? "Updating..." : NEXT_LABELS[period.status]}
        </Button>
      )}
    </div>
  );
}
