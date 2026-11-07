"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {getSavedChurchId} from "@/lib/workspace";

type Case={id:string;reason:string;absence_count:number;status:string;notes:string|null;created_at:string;children:{id:string;first_name:string;last_name:string;classes:{name:string}|null}|null};
const labels:Record<string,string>={open:"Open",in_progress:"In progress",completed:"Completed",dismissed:"Dismissed"};

export default function FollowUpPage(){
 const [items,setItems]=useState<Case[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 async function load(){const church=getSavedChurchId();if(!church)return;setLoading(true);const {data,error}=await supabase.from("follow_up_cases").select("id,reason,absence_count,status,notes,created_at,children(id,first_name,last_name,classes(name))").eq("church_id",church).in("status",["open","in_progress"]).order("created_at",{ascending:false});setItems((data??[]) as unknown as Case[]);setMessage(error?.message??"");setLoading(false);}
 useEffect(()=>{load();},[]);
 async function update(id:string,status:string){
  const notes=window.prompt(status==="completed"?"Add an optional follow-up note:":"Add an optional update:")??undefined;
  const payload:Record<string,unknown>={status};if(notes!==undefined)payload.notes=notes;if(status==="completed")payload.completed_at=new Date().toISOString();
  const {error}=await supabase.from("follow_up_cases").update(payload).eq("id",id);if(error){setMessage(error.message);return;}setItems(items=>status==="completed"?items.filter(x=>x.id!==id):items.map(x=>x.id===id?{...x,status,notes:notes??x.notes}:x));
 }
 return <main className="p-5 md:p-8"><div><h1 className="text-2xl font-black">Follow-up queue</h1><p className="mt-1 text-sm text-slate-500">Children flagged by attendance patterns who may need pastoral or family follow-up.</p></div>
 <div className="mt-6 space-y-3">{loading?<p className="text-sm">Loading follow-up cases...</p>:items.length===0?<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No open follow-up cases. Attendance patterns currently look healthy.</div>:items.map(item=><article key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">{item.reason.replace("_"," ")}</p><h2 className="mt-1 text-lg font-black">{item.children?.first_name} {item.children?.last_name}</h2><p className="mt-1 text-sm text-slate-500">{item.children?.classes?.name??"No class"} · {item.absence_count} recent absences</p>{item.notes&&<p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{item.notes}</p>}</div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{labels[item.status]}</span></div>
 <div className="mt-4 flex flex-wrap gap-2">{item.status==="open"&&<button onClick={()=>update(item.id,"in_progress")} className="rounded-lg border px-3 py-2 text-sm font-bold">Start follow-up</button>}<button onClick={()=>update(item.id,"completed")} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Mark completed</button><button onClick={()=>update(item.id,"dismissed")} className="rounded-lg border px-3 py-2 text-sm">Dismiss</button></div></article>)}</div>{message&&<p className="mt-4 text-sm text-red-600">{message}</p>}</main>;
}