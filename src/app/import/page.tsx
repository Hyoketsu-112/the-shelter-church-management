"use client";
import { ChangeEvent, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

type Row = Record<string, unknown>;
const value=(v:unknown)=>String(v??"").trim();
const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
function pick(raw:Row,...names:string[]) {
  for(const name of names){const found=Object.keys(raw).find(k=>key(k)===key(name));if(found)return raw[found];}
  return "";
}
function dateValue(v:unknown):string {
  if(typeof v==="number"){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;}
  if(v instanceof Date&&!Number.isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  const s=value(v); if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:"";
}
function normalise(raw:Row) {
  const t=(...n:string[])=>value(pick(raw,...n));
  return {
    location:t("Location"), first_name:t("First Name"), last_name:t("Last Name"),
    date_of_birth:dateValue(pick(raw,"Date of Birth","DOB")), gender:t("Gender"),
    class_name:t("Class Name","Class"), status:t("Status")||"active",
    joined_on:dateValue(pick(raw,"Joined On","Date Joined")),
    allergies:t("Allergies"), medical_notes:t("Medical Notes"), special_needs_notes:t("Special Needs Notes"),
    emergency_contact_name:t("Emergency Contact Name"), emergency_contact_phone:t("Emergency Contact Phone"),
    primary_guardian_full_name:t("Primary Guardian Full Name"), primary_guardian_relationship:t("Primary Guardian Relationship"),
    primary_guardian_phone:t("Primary Guardian Phone"), primary_guardian_whatsapp:t("Primary Guardian WhatsApp"),
    primary_guardian_email:t("Primary Guardian Email"), primary_guardian_authorised_pickup:t("Primary Guardian Authorised Pickup"),
    secondary_guardian_full_name:t("Secondary Guardian Full Name"), secondary_guardian_relationship:t("Secondary Guardian Relationship"),
    secondary_guardian_phone:t("Secondary Guardian Phone"), secondary_guardian_whatsapp:t("Secondary Guardian WhatsApp"),
    secondary_guardian_email:t("Secondary Guardian Email"), secondary_guardian_authorised_pickup:t("Secondary Guardian Authorised Pickup")
  };
}
type ImportRow=ReturnType<typeof normalise>;
export default function ImportPage(){
  const [rows,setRows]=useState<ImportRow[]>([]),[fileName,setFileName]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  function read(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setFileName(file.name);const reader=new FileReader();reader.onload=ev=>{try{const wb=XLSX.read(ev.target?.result,{type:"array",cellDates:true});const data=XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]],{defval:""}).map(normalise);setRows(data);setMessage(`${data.length} rows loaded for validation.`)}catch{setMessage("Could not read this file. Please use the official CSV or XLSX template.");}};reader.readAsArrayBuffer(file);}
  const invalid=rows.filter(r=>!r.first_name||!r.last_name||!r.date_of_birth);
  async function runImport(){const church=getSavedChurchId();if(!church)return setMessage("Choose a location before importing.");if(!rows.length)return;if(invalid.length)return setMessage(`Fix ${invalid.length} row(s) with missing required child information.`);setBusy(true);const {data,error}=await supabase.rpc("import_children_with_guardians",{p_church_id:church,p_filename:fileName,p_rows:rows});setBusy(false);if(error)return setMessage(error.message);const result=data as {imported:number;skipped:number;failed:number};setMessage(`Import complete: ${result.imported} imported, ${result.skipped} duplicates skipped, ${result.failed} failed.`);if(result.failed===0)setRows([]);}
  return <main className="p-5 md:p-8"><h1 className="text-2xl font-black">Import children & families</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Use the official Excel template. The importer validates child records and imports linked primary and secondary guardians.</p>
  <div className="mt-6 rounded-2xl border bg-white p-5"><input type="file" accept=".csv,.xlsx,.xls" onChange={read}/>
  {rows.length>0&&<><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Child</th><th className="p-2">Date of birth</th><th className="p-2">Class</th><th className="p-2">Primary guardian</th><th className="p-2">Status</th></tr></thead><tbody>{rows.slice(0,25).map((r,i)=>{const bad=!r.first_name||!r.last_name||!r.date_of_birth;return <tr key={i} className="border-b"><td className="p-2">{r.first_name} {r.last_name}</td><td className="p-2">{r.date_of_birth}</td><td className="p-2">{r.class_name||"—"}</td><td className="p-2">{r.primary_guardian_full_name||"—"}</td><td className="p-2">{bad?"Needs required data":"Ready"}</td></tr>})}</tbody></table></div>
  <p className="mt-3 text-sm">{rows.length} rows loaded • {invalid.length} need attention • previewing first 25 rows</p>
  <button disabled={busy||!!invalid.length} onClick={runImport} className="mt-4 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Importing...":"Confirm import"}</button></>}</div>
  {message&&<p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}</main>;
}