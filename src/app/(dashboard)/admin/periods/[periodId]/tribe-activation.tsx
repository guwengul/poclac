"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Zap, ArrowRight } from "lucide-react";
import { TribePeriodStatus } from "@prisma/client";

type TribeRow = {
  id: string;
  name: string;
  tribePeriod: {
    id: string;
    status: TribePeriodStatus;
    activatedAt: Date | null;
  } | null;
};

const STATUS_LABELS: Record<TribePeriodStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Scoring Open",
  CALIBRATION: "Calibration",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<TribePeriodStatus, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-green-100 text-green-700",
  CALIBRATION: "bg-blue-100 text-blue-700",
  CLOSED: "bg-gray-100 text-gray-400",
};

export function TribeActivation({
  periodId,
  tribes,
  isReadOnly,
}: {
  periodId: string;
  tribes: TribeRow[];
  isReadOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  async function activate(tribeId: string, tribePeriodId: string | null) {
    setLoading(tribeId);
    let tpId = tribePeriodId;

    if (!tpId) {
      const res = await fetch("/api/admin/tribe-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, tribeId }),
      });
      if (!res.ok) {
        setResults(r => ({ ...r, [tribeId]: "Failed to create" }));
        setLoading(null);
        return;
      }
      tpId = (await res.json()).id;
    }

    const res = await fetch(`/api/admin/tribe-periods/${tpId}/activate`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      const err = await res.json();
      setResults(r => ({ ...r, [tribeId]: err.error ?? "Error" }));
      return;
    }
    const data = await res.json();
    setResults(r => ({ ...r, [tribeId]: `${data.assignments.created} assignments created` }));
    router.refresh();
  }

  async function transition(tribePeriodId: string, tribeId: string, toStatus: TribePeriodStatus) {
    setLoading(tribeId);
    const res = await fetch(`/api/admin/tribe-periods/${tribePeriodId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toStatus }),
    });
    setLoading(null);
    if (!res.ok) {
      const err = await res.json();
      setResults(r => ({ ...r, [tribeId]: err.error ?? "Error" }));
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Tribe Status</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Activate a tribe to generate assignments. Move to Calibration when scoring is complete.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {tribes.map((tribe) => {
          const tp = tribe.tribePeriod;
          const status = tp?.status ?? "PENDING";
          const isActivating = loading === tribe.id;
          const result = results[tribe.id];

          return (
            <div key={tribe.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {status === "ACTIVE" || status === "CALIBRATION" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
                <div>
                  <span className="text-sm font-medium text-gray-900">{tribe.name}</span>
                  {result && <span className="text-xs text-green-600 ml-2">{result}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tp && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                )}

                {isActivating && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

                {!isActivating && status === "PENDING" && (
                  <button
                    onClick={() => activate(tribe.id, tp?.id ?? null)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors">
                    <Zap className="w-3 h-3" />
                    Activate
                  </button>
                )}

                {!isActivating && status === "ACTIVE" && tp && (
                  <button
                    onClick={() => transition(tp.id, tribe.id, "CALIBRATION")}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
                    <ArrowRight className="w-3 h-3" />
                    Move to Calibration
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {tribes.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No tribes defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
