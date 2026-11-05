"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing your secure sign-in...");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const errorDescription = searchParams.get("error_description");
      if (errorDescription) {
        if (!cancelled) {
          setMessage("This sign-in link is invalid or has expired. Please request a new one.");
          setTimeout(() => router.replace("/"), 2500);
        }
        return;
      }

      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          if (!cancelled) {
            setMessage(`Unable to complete sign-in: ${error.message}`);
            setTimeout(() => router.replace("/"), 3000);
          }
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelled) {
          setMessage("No active session was created. Please request a new sign-in link.");
          setTimeout(() => router.replace("/"), 2500);
        }
        return;
      }

      if (!cancelled) {
        router.replace("/dashboard");
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <p className="text-sm font-bold tracking-[.25em] text-orange-600">
          THE SHELTER
        </p>
        <h1 className="mt-3 text-2xl font-black text-slate-900">
          Signing you in
        </h1>
        <p className="mt-3 text-sm text-slate-500">{message}</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
          <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-600">
            Completing your secure sign-in...
          </p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
