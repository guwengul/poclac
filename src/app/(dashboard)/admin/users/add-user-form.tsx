"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AddUserForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", hasLogin: false, password: "", isAdmin: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    const res = await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        hasLogin: form.hasLogin,
        password: form.hasLogin ? form.password : undefined,
        isAdmin: form.hasLogin ? form.isAdmin : false,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "An error occurred."); return; }

    setSuccess(`${data.person.name} added.`);
    setForm({ name: "", email: "", hasLogin: false, password: "", isAdmin: false });
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Add Person</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-1">
          <input name="hasLogin" type="checkbox" checked={form.hasLogin} onChange={handleChange}
            className="rounded border-gray-300" />
          Can log in to this platform
        </label>

        {form.hasLogin && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                required={form.hasLogin} minLength={8}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
                placeholder="Min. 8 characters" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input name="isAdmin" type="checkbox" checked={form.isAdmin} onChange={handleChange}
                className="rounded border-gray-300" />
              Grant admin access
            </label>
          </>
        )}

        {!form.hasLogin && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Person will be in the system for evaluation purposes but cannot log in.
            Assign them to a squad and functional area from the Organization page.
          </p>
        )}

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</p>}

        <Button type="submit" disabled={loading} className="mt-1" style={{ background: "var(--primary)" }}>
          {loading ? "Adding..." : "Add Person"}
        </Button>
      </form>
    </div>
  );
}
