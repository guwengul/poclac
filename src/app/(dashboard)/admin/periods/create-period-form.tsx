"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreatePeriodForm() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    name: "",
    startDate: today,
    endDate: "",
    scoringDeadline: "",
    calibrationDeadline: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const res = await fetch("/api/admin/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }

    setForm({ name: "", startDate: today, endDate: "", scoringDeadline: "", calibrationDeadline: "" });
    router.refresh();
    router.push(`/admin/periods/${data.period.id}`);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">New Period</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Period Name</label>
          <input name="name" value={form.name} onChange={handleChange} required
            placeholder="e.g. 2026-H1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input name="endDate" type="date" value={form.endDate} onChange={handleChange} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Scoring Deadline</label>
          <input name="scoringDeadline" type="date" value={form.scoringDeadline} onChange={handleChange} required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Calibration Deadline</label>
          <input name="calibrationDeadline" type="date" value={form.calibrationDeadline} onChange={handleChange} required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-1" style={{ background: "var(--primary)" }}>
          {loading ? "Creating..." : "Create Period"}
        </Button>
      </form>
    </div>
  );
}
