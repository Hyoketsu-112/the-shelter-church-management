"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ClassItem = {
  id: string;
  name: string;
};

type Guardian = {
  id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  is_primary: boolean;
};

type Child = {
  id: string;
  church_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string | null;
  class_id: string | null;
  medical_notes: string | null;
  special_needs_notes: string | null;
  status: string;
  joined_on: string | null;
  archived_at: string | null;
};

function ChildPageContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [child, setChild] = useState<Child | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", id)
        .single();

      if (childError || !childData) {
        setMessage(childError?.message || "Child record not found.");
        setLoading(false);
        return;
      }

      const [classesResult, guardianLinksResult] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name")
          .eq("church_id", childData.church_id)
          .order("name"),
        supabase
          .from("child_guardians")
          .select(
            "is_primary, guardians(id, full_name, relationship, phone)"
          )
          .eq("child_id", id),
      ]);

      setChild(childData);
      setClasses(classesResult.data ?? []);

      const guardianItems: Guardian[] = (guardianLinksResult.data ?? [])
        .map((link) => {
          const guardian = Array.isArray(link.guardians)
            ? link.guardians[0]
            : link.guardians;

          if (!guardian) return null;

          return {
            id: guardian.id,
            full_name: guardian.full_name,
            relationship: guardian.relationship,
            phone: guardian.phone,
            is_primary: link.is_primary,
          };
        })
        .filter((guardian): guardian is Guardian => guardian !== null);

      setGuardians(guardianItems);
      setLoading(false);
    }

    load();
  }, [id, router]);

  function updateChild<K extends keyof Child>(key: K, value: Child[K]) {
    setChild((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!child) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("children")
      .update({
        first_name: child.first_name.trim(),
        last_name: child.last_name.trim(),
        date_of_birth: child.date_of_birth,
        gender: child.gender || null,
        class_id: child.class_id || null,
        medical_notes: child.medical_notes || null,
        special_needs_notes: child.special_needs_notes || null,
        status: child.status,
        joined_on: child.joined_on || null,
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Child record saved successfully.");
    setSaving(false);
  }

  async function archive() {
    if (!window.confirm("Archive this child record?")) return;

    const { error } = await supabase
      .from("children")
      .update({
        archived_at: new Date().toISOString(),
        status: "inactive",
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/children");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading child record...</p>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <p className="text-red-600">
            {message || "Child record not found."}
          </p>
          <Link
            href="/children"
            className="mt-4 inline-block text-blue-600"
          >
            Back to Children
          </Link>
        </div>
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
              {child.first_name} {child.last_name}
            </h1>
          </div>

          <Link
            href="/children"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700"
          >
            Back to Children
          </Link>
        </header>

        <form
          onSubmit={save}
          className="mt-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-900">
            Child Information
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              First Name
              <input
                required
                value={child.first_name}
                onChange={(event) =>
                  updateChild("first_name", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Last Name
              <input
                required
                value={child.last_name}
                onChange={(event) =>
                  updateChild("last_name", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Date of Birth
              <input
                required
                type="date"
                value={child.date_of_birth}
                onChange={(event) =>
                  updateChild("date_of_birth", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Gender
              <select
                value={child.gender ?? ""}
                onChange={(event) =>
                  updateChild("gender", event.target.value || null)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Class
              <select
                value={child.class_id ?? ""}
                onChange={(event) =>
                  updateChild("class_id", event.target.value || null)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">No class assigned</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Status
              <select
                value={child.status}
                onChange={(event) =>
                  updateChild("status", event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Date Joined
              <input
                type="date"
                value={child.joined_on ?? ""}
                onChange={(event) =>
                  updateChild("joined_on", event.target.value || null)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Medical Notes
            <textarea
              value={child.medical_notes ?? ""}
              onChange={(event) =>
                updateChild("medical_notes", event.target.value || null)
              }
              className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Special Needs Notes
            <textarea
              value={child.special_needs_notes ?? ""}
              onChange={(event) =>
                updateChild(
                  "special_needs_notes",
                  event.target.value || null
                )
              }
              className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          {message && (
            <p
              className={`mt-4 text-sm ${
                message.includes("successfully")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={archive}
              className="rounded-lg border border-red-200 px-5 py-3 font-medium text-red-600"
            >
              Archive Child
            </button>
          </div>
        </form>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Guardians</h2>
              <p className="text-sm text-gray-500">
                Parent and guardian contact information.
              </p>
            </div>

            <Link
              href={`/children/${id}/guardians/new`}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
            >
              Add Guardian
            </Link>
          </div>

          {guardians.length === 0 ? (
            <p className="mt-4 text-gray-500">
              No guardians have been added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {guardians.map((guardian) => (
                <div
                  key={guardian.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {guardian.full_name}
                    </p>
                    {guardian.is_primary && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                        Primary
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    {guardian.relationship || "Relationship not specified"}
                  </p>

                  {guardian.phone && (
                    <p className="mt-1 text-sm text-gray-600">
                      {guardian.phone}
                    </p>
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

export default function ChildPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-gray-600">Loading child record...</p>
        </main>
      }
    >
      <ChildPageContent />
    </Suspense>
  );
}
