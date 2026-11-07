"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {getSavedChurchId} from "@/lib/workspace";

type Child={id:string;first_name:string;last_name:string;classes:{name:string}|null};
export default function Attendance(){
 const [items,setItems]=useState<Child[]>([]),[date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [present,setPresent]=useState<Record<string,boolean>>({}),[message,setMessage]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 async function load(){
  setLoading(true);const church=getSavedChurchId();if(!church){setLoading(false);return;}
  const {data:children,error}=await supabase.from("children").select("id,first_name,last_name,classes(name)").eq("church_id",church).is("archived_at",null).eq("status","active").order("first_name");
  if(error){setMessage(error.message);setLoading(false);return;}
  const ids=(children??[]).map((x:any)=>x.id);
  const {data:existing}=ids.length?await supabase.from("attendance").select("child_id,present").eq("session_date",date).in("child_id",ids):{data:[]};
  const map=Object.fromEntries((children??[]).map((x:any)=>[x.id,true]));
  (existing??[]).forEach((x:any)=>map[x.child_id]=x.present);
  setItems((children??[]) as unknown as Child[]);setPresent(map);setLoading(false);
 }
 useEffect(()=>{load()},[date]);
 function markAll(value:boolean){setPresent(Object.fromEntries(items.map(x=>[x.id,value])));}
 async function save(){
  const church=getSavedChurchId();if(!church)return setMessage("Choose a location first.");
  setSaving(true);setMessage("");
  const {data,error}=await supabase.rpc("save_attendance_session",{p_church_id:church,p_session_date:date,p_records:items.map(x=>({child_id:x.id,present:!!present[x.id]}))});
  setSaving(false);if(error)return setMessage(error.message);
  const r=data as {total:number;present:number;absent:number};setMessage(`Saved: ${r.present} present, ${r.absent} absent, ${r.total} total.`);
 }
 return <main className="p-5 md:p-8">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black">Attendance</h1><p className="mt-1 text-sm text-slate-500">Mark attendance, correct mistakes, and trigger follow-up for repeated absences.</p></div><input type="date" className="rounded-xl border p-2" value={date} onChange={e=>setDate(e.target.value)}/></div>
  <div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>markAll(true)} className="rounded-lg border px-4 py-2 text-sm font-bold">Mark all present</button><button onClick={()=>markAll(false)} className="rounded-lg border px-4 py-2 text-sm font-bold">Mark all absent</button><button onClick={load} className="rounded-lg border px-4 py-2 text-sm">Refresh</button></div>
  {loading?<p className="mt-6">Loading...</p>:<><div className="mt-5 overflow-hidden rounded-2xl border bg-white">{items.length===0?<p className="p-6 text-sm text-slate-500">No active children found.</p>:items.map(c=><label key={c.id} className="flex items-center justify-between gap-4 border-b p-4 last:border-0"><div><p className="font-semibold">{c.first_name} {c.last_name}</p><p className="text-xs text-slate-500">{c.classes?.name??"No class assigned"}</p></div><div className="flex items-center gap-2"><span className={"text-sm font-bold "+(present[c.id]?"text-green-700":"text-slate-500")}>{present[c.id]?"Present":"Absent"}</span><input aria-label={`Attendance for ${c.first_name} ${c.last_name}`} type="checkbox" checked={!!present[c.id]} onChange={e=>setPresent({...present,[c.id]:e.target.checked})} className="h-5 w-5"/></div></label>)}</div>
  <button disabled={saving||!items.length} onClick={save} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{saving?"Saving...":"Save attendance"}</button></>}
  {message&&<p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}
 </main>;
}