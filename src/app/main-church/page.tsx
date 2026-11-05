"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

export default function MainChurchDashboard(){
 const [count,setCount]=useState(0); const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const churchId=getSavedChurchId(); if(!churchId){setLoading(false);return;} const {count}=await supabase.from('members').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active'); setCount(count??0); setLoading(false);})()},[]);
 return <main className="p-4 md:p-6"><div className="mx-auto max-w-6xl"><header><p className="text-sm text-slate-500">The Shelter Church Management System</p><h1 className="text-3xl font-bold">Main Church</h1><p className="mt-1 text-slate-600">Adult church records are kept separately from Junior Church records.</p></header><section className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Active Members</p><p className="mt-2 text-3xl font-bold">{loading?'—':count}</p></div></section><section className="mt-6 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Main Church Workspace</h2><p className="mt-2 text-slate-600">Start building and managing the adult church member database here.</p><Link href="/main-church/members" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-3 text-white">Manage Members</Link></section></div></main>;
}
