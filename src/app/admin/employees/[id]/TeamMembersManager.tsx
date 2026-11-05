"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTeamMember, removeTeamMember } from "../actions";
import { Avatar } from "@/components/Avatar";
import { Loader2, UserPlus, X } from "lucide-react";

export interface TeamPerson {
  id: string;
  full_name: string;
  position: string | null;
  department: string | null;
  avatar_url: string | null;
}

/**
 * Admin control on a team lead's page: shows who's on the team and adds or
 * removes members. Adding an employee who is already on another team moves
 * them here.
 */
export function TeamMembersManager({
  leadId,
  members,
  candidates,
}: {
  leadId: string;
  members: TeamPerson[];
  candidates: TeamPerson[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await addTeamMember(leadId, selected);
      if (res?.error) setError(res.error);
      else {
        setSelected("");
        router.refresh();
      }
    });
  }

  function remove(memberId: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeTeamMember(leadId, memberId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-navy">Team members</h3>
      <p className="text-xs text-slate-400">
        {members.length === 0
          ? "No one on this team yet. Add employees below."
          : `${members.length} ${members.length === 1 ? "member" : "members"} report to this lead.`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 sm:flex-nowrap">
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setError(null);
          }}
          className="input"
        >
          <option value="">Add an employee…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
              {c.position ? ` · ${c.position}` : ""}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} disabled={pending || !selected} className="btn-primary shrink-0">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add
        </button>
      </div>
      {candidates.length === 0 && (
        <p className="mt-2 text-xs text-slate-400">Every other employee is already on this team.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {members.length > 0 && (
        <ul className="mt-5 divide-y divide-slate-50 border-t border-slate-50">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar name={m.full_name} src={m.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-navy">{m.full_name}</div>
                <div className="truncate text-xs text-slate-400">
                  {m.position || "Employee"}
                  {m.department ? ` · ${m.department}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(m.id)}
                disabled={pending}
                aria-label={`Remove ${m.full_name} from the team`}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
