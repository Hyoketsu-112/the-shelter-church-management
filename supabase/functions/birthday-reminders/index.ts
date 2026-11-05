// Supabase Edge Function scaffold for the daily birthday reminder job.
// Configure a scheduler to invoke this endpoint and add provider credentials as secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async()=>{
 const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data,error}=await supabase.from("children").select("id,church_id,first_name,last_name,date_of_birth").is("archived_at",null);
 if(error) return new Response(error.message,{status:500});
 const today=new Date(); const m=today.getUTCMonth()+1,d=today.getUTCDate();
 const matches=(data??[]).filter((c:any)=>{const [,mm,dd]=String(c.date_of_birth).split("-").map(Number);return mm===m&&dd===d});
 return Response.json({ok:true,matches:matches.length,note:"Configure email/SMS provider secrets before live delivery."});
});
