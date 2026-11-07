"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

const accessHelp = {
  standard: "Users sign in normally with their account credentials.",
  pin: "Use only if your organisation has configured a trusted-device PIN workflow.",
  magic_link: "Users sign in through a secure email link instead of entering a password.",
};

const eventOptions = [
  ["birthday", "Birthday reminders"],
  ["visitor", "First-time visitor alerts"],
  ["follow_up", "Attendance follow-up alerts"],
  ["import", "Import completion alerts"],
] as const;

const roleOptions = [
  ["dept_head", "Department Heads"],
  ["super_admin", "Super Admins"],
] as const;

export default function Settings() {
  const church = getSavedChurchId();
  const [accessMode, setAccessMode] = useState("standard");
  const [leadDaysInput, setLeadDaysInput] = useState("7, 1, 0");
  const [channels, setChannels] = useState<string[]>(["in_app"]);
  const [enabledTypes, setEnabledTypes] = useState<string[]>(["birthday", "visitor", "follow_up", "import"]);
  const [recipientRoles, setRecipientRoles] = useState<string[]>(["super_admin", "dept_head"]);
  const [template, setTemplate] = useState("🎂 {name} turns {age} in {days} days.");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!church) {
      setLoading(false);
      return;
    }

    let active = true;
    Promise.all([
      supabase.from("churches").select("access_mode").eq("id", church).single(),
      supabase.from("notification_settings").select("*").eq("church_id", church).maybeSingle(),
    ]).then(([churchResult, settingsResult]) => {
      if (!active) return;
      if (churchResult.data) setAccessMode(churchResult.data.access_mode);
      const settings = settingsResult.data;
      if (settings) {
        setLeadDaysInput((settings.lead_days ?? [7, 1, 0]).join(", "));
        setChannels(settings.channels ?? ["in_app"]);
        setEnabledTypes(settings.enabled_types ?? ["birthday", "visitor", "follow_up", "import"]);
        setRecipientRoles(settings.recipient_roles ?? ["super_admin", "dept_head"]);
        setTemplate(settings.birthday_message_template ?? "🎂 {name} turns {age} in {days} days.");
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setMessage("Could not load notification settings.");
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, [church]);

  function toggle(values: string[], setValues: (next: string[]) => void, value: string, checked: boolean) {
    setValues(checked ? [...new Set([...values, value])] : values.filter((item) => item !== value));
  }

  async function save() {
    setMessage("");
    if (!church) return setMessage("Select a location before changing its settings.");
    const leadDays = [...new Set(leadDaysInput.split(",").map((part) => Number(part.trim())))]
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 365)
      .sort((a, b) => b - a);
    if (!leadDays.length) return setMessage("Enter at least one reminder day between 0 and 365.");
    if (!channels.length) return setMessage("Select at least one notification channel.");
    if (!recipientRoles.length) return setMessage("Select at least one staff role to receive alerts.");

    setSaving(true);
    const [churchResult, settingsResult] = await Promise.all([
      supabase.from("churches").update({ access_mode: accessMode }).eq("id", church),
      supabase.from("notification_settings").upsert({
        church_id: church,
        lead_days: leadDays,
        channels,
        enabled_types: enabledTypes,
        recipient_roles: recipientRoles,
        birthday_message_template: template,
      }),
    ]);
    setMessage(churchResult.error?.message || settingsResult.error?.message || "Settings saved.");
    setSaving(false);
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-slate-500">Administration</p>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-slate-600">These rules apply to the selected church location.</p>
        {message && <div role="status" className="mt-5 rounded-lg border bg-slate-50 p-3 text-sm">{message}</div>}

        {loading ? <p className="mt-6 rounded-xl border bg-white p-5 text-slate-500">Loading settings...</p> : (
          <div className="mt-6 space-y-5">
            <section className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-bold">Access & sign-in</h2>
              <label className="mt-4 block text-sm font-semibold">Access mode
                <select value={accessMode} onChange={(event) => setAccessMode(event.target.value)} className="mt-2 w-full rounded-lg border p-3">
                  <option value="standard">Standard login</option><option value="pin">Trusted-device PIN</option><option value="magic_link">Magic link</option>
                </select>
              </label>
              <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{accessHelp[accessMode as keyof typeof accessHelp]}</p>
            </section>

            <section className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-bold">Notification rules</h2>
              <p className="mt-1 text-sm text-slate-600">Choose which ministry events create alerts.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {eventOptions.map(([value, label]) => <label key={value} className="flex items-center gap-3 rounded-lg border p-3">
                  <input type="checkbox" checked={enabledTypes.includes(value)} onChange={(event) => toggle(enabledTypes, setEnabledTypes, value, event.target.checked)} />
                  <span className="text-sm font-semibold">{label}</span>
                </label>)}
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold">Staff recipients</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roleOptions.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input type="checkbox" checked={recipientRoles.includes(value)} onChange={(event) => toggle(recipientRoles, setRecipientRoles, value, event.target.checked)} />{label}
                  </label>)}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold">Delivery channels</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[["in_app", "In-app"], ["email", "Email"]].map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <input type="checkbox" checked={channels.includes(value)} onChange={(event) => toggle(channels, setChannels, value, event.target.checked)} />{label}
                  </label>)}
                </div>
                {channels.includes("email") && <p className="mt-2 text-xs text-amber-800">Email requires RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in Supabase Edge Function secrets. Recipients need an email on their staff account.</p>}
              </div>
            </section>

            <section className="rounded-xl border bg-white p-5">
              <h2 className="text-lg font-bold">Birthday reminders</h2>
              <p className="mt-1 text-sm text-slate-600">Use 7, 1, 0 for one week before, one day before, and the birthday.</p>
              <label className="mt-4 block text-sm font-semibold">Reminder days
                <input value={leadDaysInput} onChange={(event) => setLeadDaysInput(event.target.value)} className="mt-2 w-full rounded-lg border p-3" placeholder="7, 1, 0" />
              </label>
              <label className="mt-4 block text-sm font-semibold">Birthday message
                <textarea value={template} onChange={(event) => setTemplate(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border p-3" />
              </label>
              <p className="mt-1 text-xs text-slate-500">Template fields: {'{name}'}, {'{age}'}, {'{days}'}.</p>
            </section>

            <button onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save settings"}</button>
          </div>
        )}
      </div>
    </main>
  );
}
