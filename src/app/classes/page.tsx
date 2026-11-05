"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ClassItem = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
};

type Profile = {
  church_id: string;
  role: string;
};

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canManage =
    profile?.role === "super_admin" || profile?.role === "dept_head";

  async function loadClasses() {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, min_age, max_age")
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setClasses(data ?? []);
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("church_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setProfile(profileData);
      await loadClasses();
      setLoading(false);
    }

    loadPage();
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!profile || !canManage) {
      setMessage("You do not have permission to create classes.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("classes").insert({
      church_id: profile.church_id,
      name: name.trim(),
      min_age: minAge ? Number(minAge) : null,
      max_age: maxAge ? Number(maxAge) : null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setMinAge("");
    setMaxAge("");
    await loadClasses();
    setSaving(false);
  }

  async function deleteClass(id: string) {
    if (!canManage) return;

    const confirmed = window.confirm(
      "Delete this class? Children assigned to it will become unassigned."
    );

    if (!confirmed) return;

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadClasses();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading classes...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Children's Department Database
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Classes
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700"
          >
            Back to Dashboard
          </Link>
        </header>

        {canManage && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-900">Create a Class</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Class name"
                className="rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />

              <input
                type="number"
                min="0"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="Minimum age"
                className="rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />

              <input
                type="number"
                min="0"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="Maximum age"
                className="rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Class"}
            </button>
          </form>
        )}

        {message && (
          <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {message}
          </p>
        )}

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            Existing Classes ({classes.length})
          </h2>

          {classes.length === 0 ? (
            <p className="mt-4 text-gray-500">No classes have been created yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {classes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Ages {item.min_age ?? "Not set"} – {item.max_age ?? "Not set"}
                    </p>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => deleteClass(item.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
