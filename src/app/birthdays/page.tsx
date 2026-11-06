"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveChurchId, calculateAge } from "@/lib/active-church";

type Child = { id:string; first_name:string; last_name:string; date_of_birth:string; class_id:string|null };
type ClassInfo = { id:string; name:string };
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

function birthdayThisYear(dob:string, now:Date){ const d=new Date(`${dob}T00:00:00`); return new Date(now.getFullYear(),d.getMonth(),d.getDate()); }
function dayKey(d:Date){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(); }

export default function BirthdaysPage(){
 const router=useRouter(); const [children,setChildren]=useState<Child[]>([]); const [classes,setClasses]=useState<Record<string,string>>({});
 const [month,setMonth]=useState<number|null>(null); const [now,setNow]=useState<Date|null>(null); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
 useEffect(()=>{ const today=new Date(); setNow(today); setMonth(today.getMonth()); (async()=>{
  const {data:{user}}=await supabase.auth.getUser(); if(!user){router.replace("/");return;}
  const {data:profile,error:pe}=await supabase.from("profiles").select("church_id").eq("id",user.id).single();
  const churchId=resolveActiveChurchId(profile?.church_id); if(pe||!churchId){setMessage("Unable to determine the active church location.");setLoading(false);return;}
  const [{data:childData,error:ce},{data:classData,error:cle}]=await Promise.all([
   supabase.from("children").select("id,first_name,last_name,date_of_birth,class_id").eq("church_id",churchId).eq("status","active").is("archived_at",null).order("first_name"),
   supabase.from("classes").select("id,name").eq("church_id",churchId).order("name")
  ]);
  if(ce||cle) setMessage(ce?.message||cle?.message||"Could not load birthday information.");
  setChildren((childData??[]) as Child[]); setClasses(Object.fromEntries(((classData??[]) as ClassInfo[]).map(c=>[c.id,c.name]))); setLoading(false);
 })(); },[router]);
 const data=useMemo(()=>{ if(!now||month===null)return {today:[],upcoming:[],monthly:[] as Child[]}; const todayStart=dayKey(now); const end=todayStart+7*86400000;
  const ordered=[...children].sort((a,b)=>{let da=birthdayThisYear(a.date_of_birth,now).getTime(),db=birthdayThisYear(b.date_of_birth,now).getTime(); if(da<todayStart)da=new Date(now.getFullYear()+1,new Date(a.date_of_birth+"T00:00:00").getMonth(),new Date(a.date_of_birth+"T00:00:00").getDate()).getTime(); if(db<todayStart)db=new Date(now.getFullYear()+1,new Date(b.date_of_birth+"T00:00:00").getMonth(),new Date(b.date_of_birth+"T00:00:00").getDate()).getTime(); return da-db;});
  return {today:children.filter(c=>dayKey(birthdayThisYear(c.date_of_birth,now))===todayStart), upcoming:ordered.filter(c=>{let t=dayKey(birthdayThisYear(c.date_of_birth,now));if(t<todayStart)t=dayKey(new Date(now.getFullYear()+1,new Date(c.date_of_birth+"T00:00:00").getMonth(),new Date(c.date_of_birth+"T00:00:00").getDate()));return t>todayStart&&t<=end;}), monthly:children.filter(c=>new Date(c.date_of_birth+"T00:00:00").getMonth()===month).sort((a,b)=>new Date(a.date_of_birth+"T00:00:00").getDate()-new Date(b.date_of_birth+"T00:00:00").getDate())}; },[children,month,now]);
 if(loading||month===null||!now)return <main className="grid min-h-screen place-items-center bg-slate-50"><p className="text-slate-600">Loading birthdays...</p></main>;
 const ChildRow=({child,celebrate=false}:{child:Child;celebrate?:boolean})=>{const bd=new Date(child.date_of_birth+"T00:00:00");const turning=calculateAge(child.date_of_birth,new Date(now.getFullYear(),bd.getMonth(),bd.getDate()))??"—";return <Link href={`/children/${child.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"><div><p className="font-semibold text-slate-900">{celebrate?"🎂 ":""}{child.first_name} {child.last_name}</p><p className="mt-1 text-sm text-slate-500">{bd.getDate()} {MONTHS[bd.getMonth()]} · Turning {turning}{typeof turning==="number"?" years old":""}{child.class_id&&classes[child.class_id]?` · ${classes[child.class_id]}`:""}</p></div><span className="text-sm font-medium text-blue-700">View →</span></Link>};
 return <main className="min-h-screen bg-slate-50 p-4 md:p-6"><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Children's Department</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">Birthdays</h1><p className="mt-1 text-sm text-slate-600">Celebrate today and prepare for the birthdays coming next.</p></div><Link href="/dashboard" className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700">Back to Dashboard</Link></header>{message&&<p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{message}</p>}
 <section className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-orange-200 bg-orange-50 p-6"><p className="text-sm font-semibold text-orange-700">TODAY</p><p className="mt-2 text-3xl font-bold text-slate-900">{data.today.length} birthday{data.today.length===1?"":"s"}</p><p className="mt-1 text-sm text-slate-600">{data.today.length?"Make sure no child is forgotten today.":"No birthdays recorded for today."}</p></div><div className="rounded-2xl border border-blue-100 bg-white p-6"><p className="text-sm font-semibold text-blue-700">NEXT 7 DAYS</p><p className="mt-2 text-3xl font-bold text-slate-900">{data.upcoming.length} upcoming</p><p className="mt-1 text-sm text-slate-600">Plan ahead for the next celebrations.</p></div></section>
 <Section title="🎂 Today's Birthdays" empty="No birthdays today.">{data.today.map(c=><ChildRow key={c.id} child={c} celebrate/>)}</Section><Section title="Coming Up in the Next 7 Days" empty="No birthdays coming up in the next 7 days.">{data.upcoming.map(c=><ChildRow key={c.id} child={c}/>)}</Section>
 <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Monthly Birthday List</h2><p className="mt-1 text-sm text-slate-500">Browse every birthday recorded for a month.</p></div><select value={month} onChange={e=>setMonth(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium">{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></div><div className="mt-5 space-y-2">{data.monthly.length?data.monthly.map(c=><ChildRow key={c.id} child={c}/>):<p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No birthdays recorded for {MONTHS[month]}.</p>}</div></section></div></main>;
}
function Section({title,empty,children}:{title:string;empty:string;children:React.ReactNode}){const has=Array.isArray(children)?children.length>0:true;return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold text-slate-900">{title}</h2><div className="mt-4 space-y-2">{has?children:<p className="rounded-xl border border-dashed p-6 text-center text-slate-500">{empty}</p>}</div></section>}
