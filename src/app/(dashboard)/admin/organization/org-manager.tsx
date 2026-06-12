"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

type Person = { id: string; name: string; email: string };
type Squad = { id: string; name: string; tribeId: string };
type Tribe = {
  id: string; name: string;
  tribeLead: { id: string; name: string };
  squads: Squad[];
};

export function OrgManager({ tribes, people }: { tribes: Tribe[]; people: Person[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showTribeForm, setShowTribeForm] = useState(false);
  const [showSquadForm, setShowSquadForm] = useState<string | null>(null); // tribeId
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [tribeForm, setTribeForm] = useState({ name: "", tribeLeadId: "" });
  const [squadForm, setSquadForm] = useState({ name: "" });

  function toggleExpand(id: string) {
    setExpanded((e) => e.includes(id) ? e.filter((x) => x !== id) : [...e, id]);
  }

  async function createTribe(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/tribes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tribeForm),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setTribeForm({ name: "", tribeLeadId: "" });
    setShowTribeForm(false);
    router.refresh();
  }

  async function createSquad(e: React.FormEvent, tribeId: string) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/squads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: squadForm.name, tribeId }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setSquadForm({ name: "" });
    setShowSquadForm(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tribe list */}
      <div className="lg:col-span-2 space-y-3">
        {tribes.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 text-center text-sm text-gray-400">
            No tribes yet. Create one to get started.
          </div>
        )}

        {tribes.map((tribe) => (
          <div key={tribe.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Tribe header */}
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(tribe.id)}
            >
              {expanded.includes(tribe.id)
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />
              }
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{tribe.name}</p>
                <p className="text-xs text-gray-500">
                  TL: {tribe.tribeLead.name} · {tribe.squads.length} squad{tribe.squads.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Squads */}
            {expanded.includes(tribe.id) && (
              <div className="border-t border-gray-100 px-5 py-3 space-y-2">
                {tribe.squads.map((squad) => (
                  <div key={squad.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    {squad.name}
                  </div>
                ))}

                {showSquadForm === tribe.id ? (
                  <form onSubmit={(e) => createSquad(e, tribe.id)} className="flex gap-2 mt-2">
                    <input
                      value={squadForm.name}
                      onChange={(e) => setSquadForm({ name: e.target.value })}
                      required
                      placeholder="Squad name"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    <Button type="submit" disabled={loading} className="text-xs px-3 py-1.5 h-auto"
                      style={{ background: "var(--primary)" }}>
                      Add
                    </Button>
                    <Button type="button" variant="outline" className="text-xs px-3 py-1.5 h-auto"
                      onClick={() => setShowSquadForm(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowSquadForm(tribe.id)}
                    className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 mt-1 px-3 py-1"
                  >
                    <Plus className="w-3 h-3" /> Add Squad
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add Tribe button */}
        {!showTribeForm && (
          <button
            onClick={() => setShowTribeForm(true)}
            className="flex items-center gap-2 w-full px-5 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Tribe
          </button>
        )}
      </div>

      {/* Add Tribe form */}
      <div className="lg:col-span-1">
        {showTribeForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">New Tribe</h2>
            <form onSubmit={createTribe} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tribe Name</label>
                <input value={tribeForm.name} onChange={(e) => setTribeForm((f) => ({ ...f, name: e.target.value }))}
                  required placeholder="e.g. Digital Banking"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tribe Lead</label>
                <select value={tribeForm.tribeLeadId}
                  onChange={(e) => setTribeForm((f) => ({ ...f, tribeLeadId: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white">
                  <option value="">Select person...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1"
                  style={{ background: "var(--primary)" }}>
                  {loading ? "Creating..." : "Create Tribe"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowTribeForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {!showTribeForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">How it works</h2>
            <ul className="text-xs text-gray-500 space-y-2">
              <li>1. Create a <strong>Tribe</strong> and assign a Tribe Lead</li>
              <li>2. Expand the tribe to add <strong>Squads</strong></li>
              <li>3. Go to <strong>Users</strong> to add people to the system</li>
              <li>4. Assign evaluators per person in each <strong>Period</strong></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
