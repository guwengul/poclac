"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

export function CloseTribeButton({ tribePeriodId }: { tribePeriodId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function close() {
    setLoading(true);
    await fetch(`/api/admin/tribe-periods/${tribePeriodId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setLoading(false);
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Emin misin?</span>
        <button onClick={close} disabled={loading}
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-40">
          {loading ? "Kapatılıyor..." : "Evet, kapat"}
        </button>
        <button onClick={() => setConfirm(false)}
          className="text-xs text-gray-400 hover:text-gray-600">
          İptal
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
      <CheckCheck className="w-3.5 h-3.5" />
      Calibration Tamamlandı
    </button>
  );
}
