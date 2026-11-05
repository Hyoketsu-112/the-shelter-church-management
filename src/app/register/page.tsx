"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Church = {
  id: string;
  name: string;
};

export default function Register() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    church_id: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingChurches, setLoadingChurches] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadChurches() {
      const { data, error } = await supabase
        .from("registration_churches")
        .select("id,name")
        .order("name");

      if (!active) return;

      if (error) {
        setMessage(
          `Unable to load church locations: ${error.message}`
        );
      } else {
        const rows = (data ?? []) as Church[];
        setChurches(rows);
        if (rows[0]) {
          setForm((current) => ({
            ...current,
            church_id: current.church_id || rows[0].id,
          }));
        }
      }

      setLoadingChurches(false);
    }

    loadChurches();

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.church_id) {
      setMessage("Please select your church location.");
      return;
    }

    setLoading(true);
    setMessage("");

    // No emailRedirectTo is used here.
    // Supabase will use the project's configured Site URL for email confirmation.
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          church_id: form.church_id,
          requested_role: "teacher",
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setMessage(
        "An account already exists for this email. Please sign in or contact a Super Admin."
      );
      return;
    }

    setMessage(
      "Your account request was created. Check your email to confirm your account. A Super Admin must then activate your staff access."
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 py-10">
      <form
        onSubmit={submit}
        className="mx-auto max-w-lg rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-black">Teacher access request</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create your account, confirm your email, and wait for a Super Admin
          to activate your staff access.
        </p>

        <div className="mt-6 space-y-3">
          <input
            required
            placeholder="Full name"
            className="w-full rounded-xl border p-3"
            value={form.full_name}
            onChange={(event) =>
              setForm({ ...form, full_name: event.target.value })
            }
          />

          <input
            required
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border p-3"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />

          <input
            placeholder="Phone number"
            className="w-full rounded-xl border p-3"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />

          <input
            required
            minLength={8}
            type="password"
            placeholder="Create password (8+ characters)"
            className="w-full rounded-xl border p-3"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />

          <select
            required
            disabled={loadingChurches || churches.length === 0}
            className="w-full rounded-xl border p-3 disabled:bg-slate-100"
            value={form.church_id}
            onChange={(event) =>
              setForm({ ...form, church_id: event.target.value })
            }
          >
            {loadingChurches ? (
              <option>Loading church locations...</option>
            ) : churches.length === 0 ? (
              <option>No church locations available</option>
            ) : (
              churches.map((church) => (
                <option key={church.id} value={church.id}>
                  {church.name}
                </option>
              ))
            )}
          </select>

          <button
            disabled={loading || loadingChurches || churches.length === 0}
            className="w-full rounded-xl bg-slate-900 p-3 font-bold text-white disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Request access"}
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm">
            {message}
          </p>
        )}

        <Link
          href="/"
          className="mt-5 block text-center text-sm font-semibold"
        >
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
