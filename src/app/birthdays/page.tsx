"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BirthdayChild = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function BirthdaysPage() {
  const router = useRouter();
  const [items, setItems] = useState<BirthdayChild[]>([]);
  const [month, setMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Next.js 16 blocks new Date() during prerender.
    // Reading the current date after the component mounts keeps this page dynamic.
    setMonth(new Date().getMonth());

    async function loadBirthdays() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("children")
        .select("id, first_name, last_name, date_of_birth")
        .eq("church_id", profile.church_id)
        .eq("status", "active")
        .is("archived_at", null)
        .order("date_of_birth");

      if (error) {
        setMessage(error.message);
      } else {
        setItems(data ?? []);
      }

      setLoading(false);
    }

    loadBirthdays();
  }, [router]);

  const birthdays = useMemo(() => {
    if (month === null) return [];

    return items
      .filter((child) => {
        const birthDate = new Date(`${child.date_of_birth}T00:00:00`);
        return birthDate.getMonth() === month;
      })
      .sort((a, b) => {
        const aDay = new Date(`${a.date_of_birth}T00:00:00`).getDate();
        const bDay = new Date(`${b.date_of_birth}T00:00:00`).getDate();
        return aDay - bDay;
      });
  }, [items, month]);

  if (loading || month === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading birthdays...</p>
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
              Birthdays
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {MONTHS[month]} Birthdays
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {birthdays.length} child{birthdays.length === 1 ? "" : "ren"}
              </p>
            </div>

            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-4 py-2"
              aria-label="Select birthday month"
            >
              {MONTHS.map((monthName, index) => (
                <option key={monthName} value={index}>
                  {monthName}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {message}
            </p>
          )}

          {birthdays.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
              No birthdays recorded for {MONTHS[month]}.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-gray-200">
              {birthdays.map((child) => {
                const birthDate = new Date(
                  `${child.date_of_birth}T00:00:00`
                );

                return (
                  <Link
                    key={child.id}
                    href={`/children/${child.id}`}
                    className="flex items-center justify-between gap-4 py-4 transition hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Born {birthDate.getDate()} {MONTHS[month]}
                      </p>
                    </div>

                    <span className="text-sm font-medium text-blue-600">
                      View child →
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
