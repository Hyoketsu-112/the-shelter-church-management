"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string; type: string; title: string; message: string;
  href: string | null; is_read: boolean; created_at: string;
};

export default function NotificationsPage() {
  const [items,setItems]=useState<Notification[]>([]);
  const [loading,setLoading]=useState(true);

  async function load() {
    setLoading(true);
    const {data}=await supabase.from("user_notifications")
      .select("id,type,title,message,href,is_read,created_at")
      .eq("in_app_enabled",true)
      .order("created_at",{ascending:false}).limit(100);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function markRead(id:string) {
    await supabase.from("user_notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",id);
    setItems(items=>items.map(x=>x.id===id?{...x,is_read:true}:x));
  }
  async function markAllRead() {
    await supabase.from("user_notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("is_read",false).eq("in_app_enabled",true);
    setItems(items=>items.map(x=>({...x,is_read:true})));
  }

  return <main className="p-5 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black">Notifications</h1><p className="mt-1 text-sm text-slate-500">Important Junior Church activity, reminders and follow-up alerts.</p></div>
      <button onClick={markAllRead} className="rounded-xl border px-4 py-2 text-sm font-semibold">Mark all as read</button>
    </div>
    <div className="mt-6 space-y-3">
      {loading && <p className="text-sm text-slate-500">Loading notifications...</p>}
      {!loading && items.length===0 && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">You are all caught up. New ministry and system alerts will appear here.</div>}
      {items.map(item=> <article key={item.id} className={"rounded-2xl border bg-white p-5 "+(!item.is_read?"border-orange-200 bg-orange-50/30":"")}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">{item.type}</p><h2 className="mt-1 font-black">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{item.message}</p><p className="mt-3 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div>
        {!item.is_read&&<button onClick={()=>markRead(item.id)} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-bold">Mark read</button>}</div>
        {item.href&&<Link href={item.href} onClick={()=>markRead(item.id)} className="mt-4 inline-block text-sm font-bold text-orange-700">Open related record →</Link>}
      </article>)}
    </div>
  </main>;
}
