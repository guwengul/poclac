"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tab = "system" | "person";

function SystemUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", chapter: "", isAdmin: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "An error occurred."); return; }
    setForm({ name: "", email: "", password: "", chapter: "", isAdmin: false });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        Creates a login account. Use for POs, Chapter Leads, Agile Coaches, and Admins who need to log in.
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
        <input name="name" value={form.name} onChange={handleChange} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="John Smith" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="john@company.com" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="Min. 8 characters" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Chapter (optional)</label>
        <input name="chapter" value={form.chapter} onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="Backend, Frontend..." />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input name="isAdmin" type="checkbox" checked={form.isAdmin} onChange={handleChange}
          className="rounded border-gray-300" />
        Grant admin access
      </label>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-1" style={{ background: "var(--primary)" }}>
        {loading ? "Adding..." : "Add System User"}
      </Button>
    </form>
  );
}

function PersonOnlyForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", chapter: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "An error occurred."); return; }
    setForm({ name: "", email: "", chapter: "" });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        No login account created. Use for team members who are evaluated but don&apos;t use this platform.
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
        <input name="name" value={form.name} onChange={handleChange} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="John Smith" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="john@company.com" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Chapter (optional)</label>
        <input name="chapter" value={form.chapter} onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          placeholder="Backend, Frontend..." />
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-1" style={{ background: "var(--primary)" }}>
        {loading ? "Adding..." : "Add Person"}
      </Button>
    </form>
  );
}

export function AddUserForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("system");

  function onSuccess() { router.refresh(); }

  const tabs: { key: Tab; label: string }[] = [
    { key: "system", label: "System User" },
    { key: "person", label: "Person Only" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Add New Person</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "system" ? <SystemUserForm onSuccess={onSuccess} /> : <PersonOnlyForm onSuccess={onSuccess} />}
    </div>
  );
}
