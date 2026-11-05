"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

type Child={id:string;first_name:string;last_name:string;date_of_birth:string;status:string;class_id:string|null;classes:{name:string}|null};
export default function ChildrenPage(){
 const router=useRouter(); const [children,setChildren]=useState<Child[]>([]); const [q,setQ]=useState(""); const [status,setStatus]=useState("all"); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 async function load(){setLoading(true); const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace("/");return;} const churchId=getSavedChurchId(); let query=supabase.from("children").select("id,first_name,last_name,date_of_birth,status,class_id,classes(name)").is("archived_at",null).order("last_name"); if(churchId) query=query.eq("church_id",churchId); const {data,error}=await query; if(error)setError(error.message); else setChildren((data??[]) as unknown as Child[]); setLoading(false)}
 useEffect(()=>{load()},[]);
 const rows=useMemo(()=>children.filter(c=>`${c.first_name} ${c.last_name}`.toLowerCase().includes(q.toLowerCase())&&(status==='all'||c.status===status)),[children,q,status]);
 if(loading)return <main className="min-h-screen grid place-items-center bg-gray-100">Loading children...</main>;
 return <main className="min-h-screen bg-gray-100 p-4 md:p-6"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap justify-between gap-4"><div><p className="text-sm text-gray-500">Children's Department Database</p><h1 className="text-2xl font-bold">Children</h1></div><div className="flex gap-2"><Link href="/dashboard" className="rounded-lg border bg-white px-4 py-2">Dashboard</Link><Link href="/children/new" className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white">Add Child</Link></div></header>
 {error&&<p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
 <section className="mt-6 rounded-xl bg-white p-5 shadow-sm"><div className="flex flex-wrap gap-3"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search child name..." className="flex-1 min-w-52 rounded-lg border px-4 py-2"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border px-3 py-2"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="graduated">Graduated</option></select></div>
 <div className="mt-5 overflow-x-auto"><table className="w-full text-left"><thead className="border-b text-sm text-gray-500"><tr><th className="p-3">Child</th><th className="p-3">Date of Birth</th><th className="p-3">Class</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{rows.map(c=><tr key={c.id} className="border-b"><td className="p-3 font-medium">{c.first_name} {c.last_name}</td><td className="p-3">{new Date(c.date_of_birth+"T00:00:00").toLocaleDateString()}</td><td className="p-3">{c.classes?.name??"Unassigned"}</td><td className="p-3 capitalize">{c.status}</td><td className="p-3"><Link href={`/children/${c.id}`} className="text-blue-600">Open</Link></td></tr>)}</tbody></table>{rows.length===0&&<p className="p-8 text-center text-gray-500">No children found.</p>}</div></section></div></main>
}
