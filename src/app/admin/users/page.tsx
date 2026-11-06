"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Church = {
  name: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  churches: Church[] | null;
};

export default function Users() {
  const [items, setItems] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setMessage("");

        // Check the currently signed-in user's role
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setMessage("You must be signed in to view Users & Access.");
          return;
        }

        const { data: currentProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          setMessage(
            "Unable to verify your access. Please try again or contact an administrator."
          );
          return;
        }

        if (currentProfile?.role !== "super_admin") {
          setMessage("Super Admin access is required to view this page.");
          return;
        }

        // Explicitly load the users and their assigned church/location.
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            role,
            is_active,
            churches!profiles_church_id_fkey (
              name
            )
          `)
          .order("full_name");

        if (error) {
          console.error("Failed to load users:", error);
          setMessage(`Unable to load users: ${error.message}`);
          return;
        }

        // Supabase returns embedded church relationships as an array.
        setItems((data ?? []) as Profile[]);
      } catch (error) {
        console.error("Unexpected error loading users:", error);
        setMessage(
          "Something unexpected happened while loading users. Please refresh the page and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  function getChurchName(profile: Profile) {
    if (profile.role === "super_admin") {
      return "All locations";
    }

    return profile.churches?.[0]?.name ?? "No location assigned";
  }

  return (
    <main className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Users & Access
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Manage who can access the Children's Department Database and what
            level of access they have. Only designated administrators should
            have Super Admin access.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">
              System Users
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View each user's role, assigned location, and account status.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading users...
            </div>
          ) : items.length === 0 && !message ? (
            <div className="p-8 text-center">
              <p className="font-medium text-slate-700">
                No users found.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                User accounts will appear here when they are added to the
                system.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">
                      Assigned Location
                    </th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="p-4">
                        <div className="font-medium text-slate-900">
                          {user.full_name || "Unnamed User"}
                        </div>

                        {user.phone && (
                          <div className="mt-1 text-sm text-slate-500">
                            {user.phone}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-700">
                          {user.role.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="p-4 text-slate-700">
                        {getChurchName(user)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            user.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}