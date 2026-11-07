"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

type FollowUp = {
  id: string;
  reason: string;
  status: string;
  absence_count: number;
  notes: string | null;
  created_at: string;
  children: { id: string; first_name: string; last_name: string } | null;
  visitor_submissions: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    child_name: string | null;
  } | null;
};

export default function FollowUps() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const church = getSavedChurchId();
    if (!church) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("follow_ups")
      .select("id,reason,status,absence_count,notes,created_at,children(id,first_name,last_name),visitor_submissions(id,full_name,phone,email,child_name)")
      .eq("church_id", church)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as FollowUp[]);
    setMessage(error?.message ?? "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function updateStatus(item: FollowUp, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === "completed") {
      patch.completed_at = now;
      patch.completed_by = user?.id ?? null;
    }
    const { error } = await supabase.from("follow_ups").update(patch).eq("id", item.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (item.visitor_submissions) {
      const visitorStatus = status === "completed" ? "contacted" : status === "dismissed" ? "archived" : "new";
      await supabase.from("visitor_submissions").update({ status: visitorStatus }).eq("id", item.visitor_submissions.id);
    }
    await load();
  }

  return (
    <main className="p-5 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Follow-up</h1>
          <p className="mt-1 text-sm text-slate-500">First-time visitors and children who may need ministry follow-up.</p>
        </div>
        <button onClick={() => void load()} className="rounded-lg border px-4 py-2 text-sm">Refresh</button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? <p>Loading...</p> : items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No follow-up cases yet.</div>
        ) : items.map((item) => {
          const visitor = item.visitor_submissions;
          const name = visitor?.full_name ?? `${item.children?.first_name ?? ""} ${item.children?.last_name ?? ""}`.trim();
          return <article key={item.id} className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-orange-700">{item.reason.replaceAll("_", " ")}</p>
                <h2 className="mt-1 text-lg font-black">{name}</h2>
                {visitor ? <div className="mt-1 space-y-1 text-sm text-slate-600">
                  {visitor.child_name && <p>Child: {visitor.child_name}</p>}
                  {visitor.phone && <p>Phone: {visitor.phone}</p>}
                  {visitor.email && <p>Email: {visitor.email}</p>}
                </div> : <p className="mt-1 text-sm text-slate-600">{item.absence_count} recent recorded absences.</p>}
                <p className="mt-2 text-xs text-slate-400">Opened {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{item.status.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.status === "open" && <button onClick={() => void updateStatus(item, "in_progress")} className="rounded-lg border px-3 py-2 text-sm font-bold">Start follow-up</button>}
              {(item.status === "open" || item.status === "in_progress") && <button onClick={() => void updateStatus(item, "completed")} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Mark completed</button>}
              {(item.status === "open" || item.status === "in_progress") && <button onClick={() => void updateStatus(item, "dismissed")} className="rounded-lg border px-3 py-2 text-sm">Dismiss</button>}
            </div>
          </article>;
        })}
      </div>
      {message && <p role="status" className="mt-4 text-sm text-red-700">{message}</p>}
    </main>
  );
}
