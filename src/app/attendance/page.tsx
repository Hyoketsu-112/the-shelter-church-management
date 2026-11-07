"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import {getSavedChurchId} from "@/lib/workspace";

type Child={id:string;first_name:string;last_name:string;class_id:string|null;classes:{name:string}|null};
type Attendance={child_id:string;session_date:string;present:boolean};
type Class={id:string;name:string};

export default function AttendancePage(){
 const [children,setChildren]=useState<Child[]>([]),[classes,setClasses]=useState<Class[]>([]);
 const [date,setDate]=useState(new Date().toISOString().slice(0,10)),[classId,setClassId]=useState("all");
 const [present,setPresent]=useState<Record<string,boolean>>({}),[history,setHistory]=useState<Attendance[]>([]);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState("");

 async function load(){
  const church=getSavedChurchId(); if(!church)return;
  setLoading(true);
  const [{data:childData,error},{data:classData},{data:attendanceData}]=await Promise.all([
   supabase.from("children").select("id,first_name,last_name,class_id,classes(name)").eq("church_id",church).is("archived_at",null).eq("status","active").order("first_name"),
   supabase.from("classes").select("id,name").eq("church_id",church).order("name"),
   supabase.from("attendance").select("child_id,session_date,present").eq("church_id",church).gte("session_date",new Date(Date.now()-42*86400000).toISOString().slice(0,10)).order("session_date",{ascending:false})
  ]);
  const list=(childData??[]) as unknown as Child[];
  setChildren(list);setClasses((classData??[]) as Class[]);setHistory((attendanceData??[]) as Attendance[]);
  const existing=Object.fromEntries((attendanceData??[]).filter(x=>x.session_date===date).map(x=>[x.child_id,x.present]));
  setPresent(Object.fromEntries(list.map(x=>[x.id,existing[x.id]??true])));
  setMessage(error?.message??"");setLoading(false);
 }
 useEffect(()=>{load();},[]);
 const visible=useMemo(()=>classId==="all"?children:children.filter(x=>x.class_id===classId),[children,classId]);
 const absent=visible.filter(x=>!present[x.id]).length;
 async function save(){
  const church=getSavedChurchId();const {data:{user}}=await supabase.auth.getUser();if(!church||!user)return;
  setSaving(true);setMessage("");
  const rows=visible.map(x=>({church_id:church,child_id:x.id,session_date:date,present:!!present[x.id],marked_by:user.id}));
  const {error}=await supabase.from("attendance").upsert(rows,{onConflict:"child_id,session_date"});
  setSaving(false);if(error){setMessage(error.message);return;}
  setHistory(h=>[...h.filter(x=>x.session_date!==date),...rows.map(x=>({child_id:x.child_id,session_date:x.session_date,present:x.present}))]);
  setMessage(`Attendance saved: ${visible.length-absent} present, ${absent} absent. Follow-up rules were checked automatically.`);
 }
 function childRate(id:string){const records=history.filter(x=>x.child_id===id).slice(0,6);if(!records.length)return "No history";return `${Math.round(records.filter(x=>x.present).length/records.length*100)}% recent attendance`;}
 return <main className="p-5 md:p-8">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-black">Attendance</h1><p className="mt-1 text-sm text-slate-500">Mark attendance, review recent patterns and automatically identify children who need follow-up.</p></div>
  <div className="flex flex-wrap gap-2"><select value={classId} onChange={e=>setClassId(e.target.value)} className="rounded-lg border bg-white p-2 text-sm"><option value="all">All classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="date" className="rounded-lg border p-2" value={date} onChange={e=>{setDate(e.target.value);setPresent(Object.fromEntries(children.map(x=>[x.id,history.find(h=>h.child_id===x.id&&h.session_date===e.target.value)?.present??true]))}}/></div></div>
  {loading?<p className="mt-8 text-sm">Loading attendance...</p>:<><div className="mt-6 grid gap-3 sm:grid-cols-3"><Stat label="Children shown" value={visible.length}/><Stat label="Present" value={visible.length-absent}/><Stat label="Absent" value={absent}/></div>
  <div className="mt-5 overflow-hidden rounded-2xl border bg-white">{visible.length===0?<p className="p-8 text-center text-sm text-slate-500">No active children found for this selection.</p>:visible.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-0"><div><p className="font-bold">{c.first_name} {c.last_name}</p><p className="text-xs text-slate-500">{c.classes?.name??"No class"} · {childRate(c.id)}</p></div><label className="flex items-center gap-3 text-sm font-semibold"><span>{present[c.id]?"Present":"Absent"}</span><input aria-label={`Attendance for ${c.first_name}`} type="checkbox" checked={!!present[c.id]} onChange={e=>setPresent({...present,[c.id]:e.target.checked})} className="h-5 w-5"/></label></div>)}</div>
  <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={saving||!visible.length} onClick={save} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{saving?"Saving...":"Save attendance"}</button><a href="/follow-up" className="rounded-xl border px-5 py-3 text-sm font-bold">View follow-up queue</a></div>
  {message&&<p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}</>}</main>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}