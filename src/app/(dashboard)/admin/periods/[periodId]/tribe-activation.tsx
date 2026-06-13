"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Zap } from "lucide-react";
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

const STATUS_COLORS: Record<TribePeriodStatus, string> = {
  PENDING: "text-gray-400",
  ACTIVE: "text-green-600",
  CLOSED: "text-gray-500",
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

    // Create TribePeriod first if it doesn't exist
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
      const data = await res.json();
      tpId = data.id;
    }

    const res = await fetch(`/api/admin/tribe-periods/${tpId}/activate`, {
      method: "POST",
    });

    setLoading(null);
    if (!res.ok) {
      const data = await res.json();
      setResults(r => ({ ...r, [tribeId]: data.error ?? "Error" }));
      return;
    }
    const data = await res.json();
    setResults(r => ({ ...r, [tribeId]: `${data.assignments.created} assignments created` }));
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Tribe Activation</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Activating a tribe auto-generates evaluator assignments from org structure.
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {tribes.map((tribe) => {
          const tp = tribe.tribePeriod;
          const isActive = tp?.status === "ACTIVE";
          const isPending = !tp || tp.status === "PENDING";
          const isActivating = loading === tribe.id;
          const result = results[tribe.id];

          return (
            <div key={tribe.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className={`w-4 h-4 flex-shrink-0 ${STATUS_COLORS[tp?.status ?? "PENDING"]}`} />
                )}
                <div>
                  <span className="text-sm font-medium text-gray-900">{tribe.name}</span>
                  {isActive && tp?.activatedAt && (
                    <span className="text-xs text-gray-400 ml-2">
                      activated {new Date(tp.activatedAt).toLocaleDateString()}
                    </span>
                  )}
                  {result && (
                    <span className="text-xs text-green-600 ml-2">{result}</span>
                  )}
                </div>
              </div>

              {!isReadOnly && isPending && (
                <button
                  onClick={() => activate(tribe.id, tp?.id ?? null)}
                  disabled={isActivating}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  {isActivating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  Activate & Generate Assignments
                </button>
              )}

              {isActive && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  Active
                </span>
              )}
            </div>
          );
        })}

        {tribes.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No tribes defined yet. Add tribes in the Organization page.
          </div>
        )}
      </div>
    </div>
  );
}
