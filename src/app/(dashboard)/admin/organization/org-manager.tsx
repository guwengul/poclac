"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Plus, Users, Layers, X } from "lucide-react";

type Person = { id: string; name: string; email: string; functionalAreaId?: string | null };
type FunctionalArea = {
  id: string; name: string; chapterLeadId?: string | null;
  chapterLead?: { id: string; name: string } | null;
  members: { id: string; name: string }[];
};
type Squad = {
  id: string; name: string;
  productOwnerId?: string | null; productOwner?: { id: string; name: string } | null;
  agileCoachId?: string | null;   agileCoach?:   { id: string; name: string } | null;
  members: { id: string; name: string }[];
};
type Tribe = {
  id: string; name: string;
  tribeLeadId?: string | null;      tribeLead?:      { id: string; name: string } | null;
  tribeTechLeadId?: string | null;  tribeTechLead?:  { id: string; name: string } | null;
  tribeHRPartnerId?: string | null; tribeHRPartner?: { id: string; name: string } | null;
  squads: Squad[];
  functionalAreas: FunctionalArea[];
};

function PersonSelect({ value, onChange, people, placeholder }: {
  value: string; onChange: (v: string) => void;
  people: Person[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 bg-white">
      <option value="">{placeholder ?? "Select person..."}</option>
      {people.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

function RoleChip({ label, name }: { label: string; name?: string | null }) {
  return (
    <div className="text-xs">
      <span className="font-semibold text-gray-500">{label}:</span>{" "}
      <span className={name ? "text-gray-800" : "text-gray-300 italic"}>{name ?? "Not assigned"}</span>
    </div>
  );
}

function AreaCard({ area, people, onRefresh }: { area: FunctionalArea; people: Person[]; onRefresh: () => void }) {
  const [addingMember, setAddingMember] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState("");

  const memberIds = new Set(area.members.map(m => m.id));
  const available = people.filter(p => !memberIds.has(p.id));

  async function addMember() {
    if (!selectedPerson) return;
    await fetch(`/api/admin/functional-areas/${area.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId: selectedPerson }),
    });
    setSelectedPerson(""); setAddingMember(false);
    onRefresh();
  }

  async function removeMember(personId: string) {
    await fetch(`/api/admin/functional-areas/${area.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    onRefresh();
  }

  return (
    <div className="rounded-lg border border-gray-100 px-3 py-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-800">{area.name}</p>
        <button onClick={() => setAddingMember(!addingMember)}
          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> Member
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        CL: <span className="text-gray-600">{area.chapterLead?.name ?? <em>Not assigned</em>}</span>
      </p>

      {addingMember && (
        <div className="flex gap-2 mb-2">
          <PersonSelect value={selectedPerson} onChange={setSelectedPerson} people={available} placeholder="Add member..." />
          <Button size="sm" onClick={addMember} disabled={!selectedPerson} style={{ background: "var(--primary)" }}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingMember(false)}>✕</Button>
        </div>
      )}

      {area.members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {area.members.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
              {m.name}
              <button onClick={() => removeMember(m.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {area.members.length === 0 && <p className="text-xs text-gray-300 italic">No members</p>}
    </div>
  );
}

function SquadCard({ squad, people, tribeId, onRefresh }: { squad: Squad; people: Person[]; tribeId: string; onRefresh: () => void }) {
  const [addingMember, setAddingMember] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState("");

  const memberIds = new Set(squad.members.map(m => m.id));
  const available = people.filter(p => !memberIds.has(p.id));

  async function addMember() {
    if (!selectedPerson) return;
    // SquadMembership requires a periodId — use a special "permanent" approach:
    // We'll store membership without period for org purposes
    await fetch("/api/admin/squad-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ squadId: squad.id, personId: selectedPerson }),
    });
    setSelectedPerson(""); setAddingMember(false);
    onRefresh();
  }

  async function removeMember(personId: string) {
    await fetch("/api/admin/squad-members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ squadId: squad.id, personId }),
    });
    onRefresh();
  }

  const memberPeople = squad.members;

  return (
    <div className="rounded-lg border border-gray-100 px-3 py-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-gray-800">{squad.name}</p>
        <button onClick={() => setAddingMember(!addingMember)}
          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
          <Plus className="w-3 h-3" /> Member
        </button>
      </div>
      <div className="text-xs text-gray-400 mb-2 space-y-0.5">
        <p>PO: <span className="text-gray-600">{squad.productOwner?.name ?? <em>Not assigned</em>}</span></p>
        <p>AC: <span className="text-gray-600">{squad.agileCoach?.name ?? <em>Not assigned</em>}</span></p>
      </div>

      {addingMember && (
        <div className="flex gap-2 mb-2">
          <PersonSelect value={selectedPerson} onChange={setSelectedPerson} people={available} placeholder="Add member..." />
          <Button size="sm" onClick={addMember} disabled={!selectedPerson} style={{ background: "var(--primary)" }}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingMember(false)}>✕</Button>
        </div>
      )}

      {memberPeople.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {memberPeople.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
              {m.name}
              <button onClick={() => removeMember(m.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {memberPeople.length === 0 && <p className="text-xs text-gray-300 italic">No members</p>}
    </div>
  );
}

function TribeCard({ tribe, people, onRefresh }: { tribe: Tribe; people: Person[]; onRefresh: () => void }) {
  const [open, setOpen] = useState(true);
  const [editingRoles, setEditingRoles] = useState(false);
  const [roles, setRoles] = useState({
    tribeLeadId: tribe.tribeLeadId ?? "",
    tribeTechLeadId: tribe.tribeTechLeadId ?? "",
    tribeHRPartnerId: tribe.tribeHRPartnerId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [addingSquad, setAddingSquad] = useState(false);
  const [squadForm, setSquadForm] = useState({ name: "", productOwnerId: "", agileCoachId: "" });
  const [addingArea, setAddingArea] = useState(false);
  const [areaForm, setAreaForm] = useState({ name: "", chapterLeadId: "" });

  async function saveRoles() {
    setSaving(true);
    await fetch(`/api/admin/tribes/${tribe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tribeLeadId: roles.tribeLeadId || null,
        tribeTechLeadId: roles.tribeTechLeadId || null,
        tribeHRPartnerId: roles.tribeHRPartnerId || null,
      }),
    });
    setSaving(false); setEditingRoles(false);
    onRefresh();
  }

  async function addSquad(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/squads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: squadForm.name, tribeId: tribe.id,
        productOwnerId: squadForm.productOwnerId || null,
        agileCoachId: squadForm.agileCoachId || null,
      }),
    });
    setSquadForm({ name: "", productOwnerId: "", agileCoachId: "" }); setAddingSquad(false);
    onRefresh();
  }

  async function addArea(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/functional-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: areaForm.name, tribeId: tribe.id, chapterLeadId: areaForm.chapterLeadId || null }),
    });
    setAreaForm({ name: "", chapterLeadId: "" }); setAddingArea(false);
    onRefresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 font-semibold text-gray-900">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {tribe.name}
        </button>
        <button onClick={() => setEditingRoles(!editingRoles)}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium">
          {editingRoles ? "Cancel" : "Edit Roles"}
        </button>
      </div>

      {open && (
        <>
          <div className="px-5 py-4 border-b border-gray-100">
            {editingRoles ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tribe Lead (TL)</label>
                  <PersonSelect value={roles.tribeLeadId} onChange={v => setRoles(r => ({ ...r, tribeLeadId: v }))} people={people} placeholder="Not assigned" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tribe Tech Lead (TTL)</label>
                  <PersonSelect value={roles.tribeTechLeadId} onChange={v => setRoles(r => ({ ...r, tribeTechLeadId: v }))} people={people} placeholder="Not assigned" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">HR Partner</label>
                  <PersonSelect value={roles.tribeHRPartnerId} onChange={v => setRoles(r => ({ ...r, tribeHRPartnerId: v }))} people={people} placeholder="Not assigned" />
                </div>
                <div className="sm:col-span-3">
                  <Button onClick={saveRoles} disabled={saving} size="sm" style={{ background: "var(--primary)" }}>
                    {saving ? "Saving..." : "Save Roles"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                <RoleChip label="TL" name={tribe.tribeLead?.name} />
                <RoleChip label="TTL" name={tribe.tribeTechLead?.name} />
                <RoleChip label="HR Partner" name={tribe.tribeHRPartner?.name} />
              </div>
            )}
          </div>

          <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Functional Areas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-400" /> Functional Areas
                </h3>
                <button onClick={() => setAddingArea(!addingArea)}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> Add Area
                </button>
              </div>

              {addingArea && (
                <form onSubmit={addArea} className="mb-3 space-y-2 bg-purple-50 rounded-lg p-3">
                  <input value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} required
                    placeholder="e.g. Backend, Frontend, QA"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500" />
                  <PersonSelect value={areaForm.chapterLeadId} onChange={v => setAreaForm(f => ({ ...f, chapterLeadId: v }))}
                    people={people} placeholder="Chapter Lead (CL)..." />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" style={{ background: "var(--primary)" }}>Add</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAddingArea(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {tribe.functionalAreas.length === 0 && <p className="text-xs text-gray-400 italic">No functional areas defined.</p>}
                {tribe.functionalAreas.map(area => (
                  <AreaCard key={area.id} area={area} people={people} onRefresh={onRefresh} />
                ))}
              </div>
            </div>

            {/* Squads */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> Squads
                </h3>
                <button onClick={() => setAddingSquad(!addingSquad)}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> Add Squad
                </button>
              </div>

              {addingSquad && (
                <form onSubmit={addSquad} className="mb-3 space-y-2 bg-purple-50 rounded-lg p-3">
                  <input value={squadForm.name} onChange={e => setSquadForm(f => ({ ...f, name: e.target.value }))} required
                    placeholder="Squad name"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500" />
                  <PersonSelect value={squadForm.productOwnerId} onChange={v => setSquadForm(f => ({ ...f, productOwnerId: v }))}
                    people={people} placeholder="Product Owner (PO)..." />
                  <PersonSelect value={squadForm.agileCoachId} onChange={v => setSquadForm(f => ({ ...f, agileCoachId: v }))}
                    people={people} placeholder="Agile Coach (AC)..." />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" style={{ background: "var(--primary)" }}>Add</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAddingSquad(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {tribe.squads.length === 0 && <p className="text-xs text-gray-400 italic">No squads yet.</p>}
                {tribe.squads.map(squad => (
                  <SquadCard key={squad.id} squad={squad} people={people} tribeId={tribe.id} onRefresh={onRefresh} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function OrgManager({ tribes, people }: { tribes: Tribe[]; people: Person[] }) {
  const router = useRouter();
  const [showNewTribe, setShowNewTribe] = useState(false);
  const [tribeName, setTribeName] = useState("");
  const [tribeLeadId, setTribeLeadId] = useState("");

  async function createTribe(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/tribes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tribeName, tribeLeadId: tribeLeadId || null }),
    });
    setTribeName(""); setTribeLeadId(""); setShowNewTribe(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNewTribe(!showNewTribe)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Tribe
        </Button>
      </div>

      {showNewTribe && (
        <form onSubmit={createTribe} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tribe Name</label>
            <input value={tribeName} onChange={e => setTribeName(e.target.value)} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
              placeholder="e.g. Payments Tribe" />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tribe Lead (optional)</label>
            <PersonSelect value={tribeLeadId} onChange={setTribeLeadId} people={people} placeholder="Assign later..." />
          </div>
          <Button type="submit" style={{ background: "var(--primary)" }}>Create</Button>
          <Button type="button" variant="ghost" onClick={() => setShowNewTribe(false)}>Cancel</Button>
        </form>
      )}

      {tribes.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          No tribes yet. Create one to get started.
        </div>
      )}

      {tribes.map(tribe => (
        <TribeCard key={tribe.id} tribe={tribe} people={people} onRefresh={() => router.refresh()} />
      ))}
    </div>
  );
}
