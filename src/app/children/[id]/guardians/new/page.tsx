"use client";

import { FormEvent, Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type GuardianForm = {
  full_name: string;
  relationship: string;
  phone: string;
  whatsapp: string;
  email: string;
  is_authorised_pickup: boolean;
  is_primary: boolean;
};

type TextField = {
  label: string;
  key: keyof Pick<
    GuardianForm,
    "full_name" | "relationship" | "phone" | "whatsapp" | "email"
  >;
  type: "text" | "tel" | "email";
  required: boolean;
};

const fields: TextField[] = [
  { label: "Full Name", key: "full_name", type: "text", required: true },
  { label: "Relationship", key: "relationship", type: "text", required: false },
  { label: "Phone", key: "phone", type: "tel", required: false },
  { label: "WhatsApp", key: "whatsapp", type: "tel", required: false },
  { label: "Email", key: "email", type: "email", required: false },
];

function NewGuardianForm() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const router = useRouter();

  const [form, setForm] = useState<GuardianForm>({
    full_name: "",
    relationship: "",
    phone: "",
    whatsapp: "",
    email: "",
    is_authorised_pickup: false,
    is_primary: false,
  });

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof GuardianForm>(
    key: K,
    value: GuardianForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: child, error: childError } = await supabase
      .from("children")
      .select("church_id")
      .eq("id", childId)
      .single();

    if (childError || !child) {
      setMessage(childError?.message || "Child not found.");
      setSaving(false);
      return;
    }

    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .insert({
        church_id: child.church_id,
        full_name: form.full_name.trim(),
        relationship: form.relationship || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        is_authorised_pickup: form.is_authorised_pickup,
      })
      .select("id")
      .single();

    if (guardianError || !guardian) {
      setMessage(guardianError?.message || "Unable to save guardian.");
      setSaving(false);
      return;
    }

    const { error: linkError } = await supabase
      .from("child_guardians")
      .insert({
        child_id: childId,
        guardian_id: guardian.id,
        is_primary: form.is_primary,
      });

    if (linkError) {
      setMessage(linkError.message);
      setSaving(false);
      return;
    }

    router.push(`/children/${childId}`);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-xl">
        <Link href={`/children/${childId}`} className="text-blue-600">
          ← Back to child
        </Link>

        <form
          onSubmit={submit}
          className="mt-4 rounded-xl bg-white p-6 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-gray-900">
            Add Guardian
          </h1>

          <div className="mt-4 space-y-3">
            {fields.map((field) => (
              <label
                key={field.key}
                className="block text-sm font-medium text-gray-700"
              >
                {field.label}
                <input
                  required={field.required}
                  type={field.type}
                  value={form[field.key]}
                  onChange={(event) =>
                    updateField(field.key, event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            ))}

            <label className="flex gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(event) =>
                  updateField("is_primary", event.target.checked)
                }
              />
              Primary guardian
            </label>

            <label className="flex gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_authorised_pickup}
                onChange={(event) =>
                  updateField(
                    "is_authorised_pickup",
                    event.target.checked
                  )
                }
              />
              Authorized for pickup
            </label>
          </div>

          {message && (
            <p className="mt-3 text-sm text-red-600">{message}</p>
          )}

          <button
            disabled={saving}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Guardian"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewGuardianPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-gray-600">Loading guardian form...</p>
        </main>
      }
    >
      <NewGuardianForm />
    </Suspense>
  );
}
