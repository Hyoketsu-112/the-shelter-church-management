"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function finishIncomingAuth() {
      const authError = searchParams.get("error_description");
      if (authError) {
        if (active) {
          setMessage("This authentication link is invalid or has expired. Please request a new one.");
        }
        return;
      }

      const code = searchParams.get("code");
      if (!code) {
        if (searchParams.get("message") === "awaiting_approval" && active) {
          setMessage("Your account is awaiting Super Admin approval.");
        }
        return;
      }

      setLoading(true);
      setMessage("Completing your secure sign-in...");

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!active) return;

      if (error) {
        setLoading(false);
        setMessage(`Unable to complete sign-in: ${error.message}`);
        return;
      }

      router.replace("/dashboard");
    }

    finishIncomingAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "magic") {
      // No emailRedirectTo is used here.
      // Supabase will return the user to the project's configured Site URL.
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        },
      });

      setLoading(false);
      setMessage(
        error
          ? error.message
          : "Check your email and click the secure sign-in link. You will be signed in automatically without entering a password."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-7 text-center">
          <p className="text-sm font-bold tracking-[.25em] text-orange-600">
            THE SHELTER
          </p>
          <h1 className="mt-2 text-2xl font-black">Church Management</h1>
          <p className="mt-2 text-sm text-slate-500">
            Secure access for authorised church staff.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setMessage("");
            }}
            className={`rounded-lg py-2 text-sm ${
              mode === "password" ? "bg-white font-semibold shadow" : ""
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setMessage("");
            }}
            className={`rounded-lg py-2 text-sm ${
              mode === "magic" ? "bg-white font-semibold shadow" : ""
            }`}
          >
            Magic link
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl border p-3"
          />

          {mode === "password" && (
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border p-3"
            />
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 p-3 font-bold text-white disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "magic"
                ? "Send secure link"
                : "Sign in"}
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">
            {message}
          </p>
        )}

        <div className="mt-6 border-t pt-5 text-center text-sm text-slate-600">
          New teacher or volunteer?{" "}
          <Link className="font-bold text-orange-700" href="/register">
            Request staff access
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
          <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-600">
            Loading secure sign-in...
          </p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
