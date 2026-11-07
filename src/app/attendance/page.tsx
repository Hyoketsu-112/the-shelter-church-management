"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

type Child = {
  id: string;
  first_name: string;
  last_name: string;
  classes: {
    name: string;
  }[];
};

export default function Attendance() {
  const [items, setItems] = useState<Child[]>([]);
  const [date, setDate] = useState("");
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Set today's date after the component mounts to avoid
  // Next.js prerendering issues with new Date().
  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  async function load() {
    if (!date) return;

    setLoading(true);
    setMessage("");

    const church = getSavedChurchId();

    if (!church) {
      setItems([]);
      setPresent({});
      setLoading(false);
      setMessage("Please select a church location before taking attendance.");
      return;
    }

    try {
      // Load active children for the selected church.
      const { data: children, error: childrenError } = await supabase
        .from("children")
        .select(`
          id,
          first_name,
          last_name,
          classes (
            name
          )
        `)
        .eq("church_id", church)
        .eq("status", "active")
        .order("first_name");

      if (childrenError) {
        throw childrenError;
      }

      const childItems = (children ?? []) as Child[];
      setItems(childItems);

      // Load attendance already recorded for the selected date.
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("child_id, present")
        .eq("church_id", church)
        .eq("session_date", date);

      if (attendanceError) {
        throw attendanceError;
      }

      // Mark children present by default.
      const attendanceMap: Record<string, boolean> = {};

      childItems.forEach((child) => {
        attendanceMap[child.id] = true;
      });

      // Existing saved attendance overrides the default.
      (attendance ?? []).forEach((record) => {
        attendanceMap[record.child_id] = record.present;
      });

      setPresent(attendanceMap);
    } catch (error) {
      const err = error as Error;
      console.error("Attendance load error:", err);
      setMessage(err.message || "Could not load attendance data.");
    } finally {
      setLoading(false);
    }
  }

  // Load attendance after the date has been set.
  useEffect(() => {
    if (!date) return;

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function toggleAttendance(childId: string) {
    setPresent((current) => ({
      ...current,
      [childId]: !current[childId],
    }));
  }

  async function saveAttendance() {
    const church = getSavedChurchId();

    if (!church) {
      setMessage("Please select a church location before saving attendance.");
      return;
    }

    if (!date) {
      setMessage("Please select an attendance date.");
      return;
    }

    if (items.length === 0) {
      setMessage("There are no active children available for attendance.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const records = items.map((child) => ({
        child_id: child.id,
        present: present[child.id] ?? true,
      }));

      // Save and evaluate in one database transaction. This also keeps the
      // follow-up check aligned with the selected church and session date.
      const { data: saveResult, error: saveError } = await supabase.rpc(
        "save_attendance_session",
        {
          p_church_id: church,
          p_session_date: date,
          p_records: records,
        }
      );

      if (saveError) throw saveError;

      const followUpCount = Number(saveResult?.follow_ups ?? 0);

      const presentCount = Number(saveResult?.present ?? 0);
      const absentCount = Number(saveResult?.absent ?? 0);

      let successMessage =
        `Attendance saved successfully. ` +
        `${presentCount} present, ${absentCount} absent.`;

      if (
        typeof followUpCount === "number" &&
        followUpCount > 0
      ) {
        successMessage +=
          ` ${followUpCount} new follow-up case(s) were created.`;
      }

      setMessage(successMessage);

      // Reload to confirm the saved attendance state.
      await load();
    } catch (error) {
      const err = error as Error;
      console.error("Attendance save error:", err);
      setMessage(err.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  const presentCount = items.filter(
    (child) => present[child.id] !== false
  ).length;

  const absentCount = items.length - presentCount;

  return (
    <main className="p-5 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record attendance and identify children who may need follow-up.
          </p>
        </div>

        <div>
          <label
            htmlFor="attendance-date"
            className="mb-1 block text-sm font-semibold"
          >
            Attendance Date
          </label>

          <input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </div>

      {/* Attendance summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Total Children</p>
          <p className="mt-2 text-3xl font-black">{items.length}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Present</p>
          <p className="mt-2 text-3xl font-black">{presentCount}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Absent</p>
          <p className="mt-2 text-3xl font-black">{absentCount}</p>
        </div>
      </div>

      {/* Children attendance list */}
      <div className="mt-6 rounded-2xl border bg-white">
        <div className="border-b p-5">
          <h2 className="font-black">Children</h2>
          <p className="mt-1 text-sm text-slate-500">
            Children are marked present by default. Click a status to change it.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading attendance...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No active children were found for this location.
          </div>
        ) : (
          <div className="divide-y">
            {items.map((child) => {
              const isPresent = present[child.id] !== false;

              return (
                <div
                  key={child.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold">
                      {child.first_name} {child.last_name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {child.classes?.[0]?.name || "No class assigned"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAttendance(child.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      isPresent
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isPresent ? "Present" : "Absent"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={saveAttendance}
          disabled={saving || loading || items.length === 0}
          className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving Attendance..." : "Save Attendance"}
        </button>

        {message && (
          <p className="text-sm font-medium text-slate-600">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
