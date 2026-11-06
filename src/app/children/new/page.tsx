"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveChurchId } from "@/lib/active-church";

type ClassItem = { id: string; name: string };

export default function NewChildPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [classId, setClassId] = useState("");
  const [joinedOn, setJoinedOn] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadClasses() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("church_id").eq("id", user.id).single();
      const churchId = resolveActiveChurchId(profile?.church_id);
      if (!churchId) { setMessage("Choose a location before adding a child."); return; }
      const { data, error } = await supabase.from("classes").select("id, name").eq("church_id", churchId).order("name");
      if (error) setMessage(`Could not load classes: ${error.message}`);
      else setClasses(data ?? []);
    }
    loadClasses();
  }, []);
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("church_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setMessage("Unable to verify your account.");
      setLoading(false);
      return;
    }

    if (!["super_admin", "dept_head"].includes(profile.role)) {
      setMessage("You do not have permission to add child records.");
      setLoading(false);
      return;
    }

    const activeChurchId = resolveActiveChurchId(profile.church_id);
    if (!activeChurchId) { setMessage("Choose a location before saving."); setLoading(false); return; }

    const { error } = await supabase.from("children").insert({
      church_id: activeChurchId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth,
      gender: gender || null,
      class_id: classId || null,
      joined_on: joinedOn || null,
      status,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/children");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Children's Department Database</p>
            <h1 className="text-2xl font-bold text-gray-900">Add Child</h1>
          </div>
          <Link href="/children" className="rounded-lg border border-gray-300 bg-white px-4 py-2">
            Cancel
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              First Name
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3" />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Last Name
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3" />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Date of Birth
              <input required type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3" />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Gender
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3">
                <option value="">Select (optional)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Class
              <select value={classId} onChange={(e) => setClassId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3">
                <option value="">No class assigned</option>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Date Joined
              <input type="date" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3" />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
              </select>
            </label>
          </div>

          {message && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

          <button disabled={loading} type="submit"
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {loading ? "Saving..." : "Save Child Record"}
          </button>
        </form>
      </div>
    </main>
  );
}
