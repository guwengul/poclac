"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";

export function PersonActions({ person }: {
  person: { id: string; name: string; email: string; isAdmin: boolean };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: person.name, email: person.email });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true); setError("");
    const res = await fetch(`/api/admin/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete ${person.name}? This cannot be undone.`)) return;
    setLoading(true);
    await fetch(`/api/admin/people/${person.id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs w-28 outline-none focus:border-purple-500" placeholder="Name" />
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1 text-xs w-36 outline-none focus:border-purple-500" placeholder="Email" />
        <button onClick={save} disabled={loading} className="text-green-600 hover:text-green-800">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => { setEditing(false); setError(""); setForm({ name: person.name, email: person.email }); }}
          className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-gray-600">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {!person.isAdmin && (
        <button onClick={remove} disabled={loading} className="text-gray-300 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
