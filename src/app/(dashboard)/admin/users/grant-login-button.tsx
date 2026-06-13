"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GrantLoginButton({ personId, personName }: { personId: string; personName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch(`/api/admin/people/${personId}/grant-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setOpen(false); setPassword("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-purple-600 hover:text-purple-800 font-medium">
        Grant Login
      </button>
    );
  }

  return (
    <form onSubmit={grant} className="flex items-center gap-2">
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Set password"
        minLength={8}
        required
        autoFocus
        className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-purple-500 w-32"
      />
      <button type="submit" disabled={loading}
        className="text-xs font-medium text-white px-2 py-1 rounded"
        style={{ background: "var(--primary)" }}>
        {loading ? "..." : "Set"}
      </button>
      <button type="button" onClick={() => { setOpen(false); setError(""); }}
        className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  );
}
