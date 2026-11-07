"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId, saveChurch } from "@/lib/workspace";

type Profile = { full_name: string; role: string; church_id: string };
type Church = { id: string; name: string; location_key: string | null };

const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/auth/callback", "/welcome"]);

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}

function AppShellContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState("");

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (isPublicRoute) return;

    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name,role,church_id,is_active")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (!p) {
        router.replace("/");
        return;
      }

      if (p.is_active === false) {
        await supabase.auth.signOut();
        if (active) {
          router.replace("/login?message=awaiting_approval");
        }
        return;
      }

      const { data: c } = await supabase
        .from("churches")
        .select("id,name,location_key")
        .order("name");

      if (!active) return;

      const typedProfile = p as Profile;
      const allChurches = (c ?? []) as Church[];

      setProfile(typedProfile);
      setChurches(allChurches);

      const savedChurch = getSavedChurchId();

      const allowed =
        typedProfile.role === "super_admin"
          ? allChurches
          : allChurches.filter(
              (church) => church.id === typedProfile.church_id
            );

      const chosen =
        savedChurch &&
        allowed.some((church) => church.id === savedChurch)
          ? savedChurch
          : allowed[0]?.id ?? typedProfile.church_id;

      setSelectedChurch(chosen);
      saveChurch(chosen);
    }

    load();

    return () => {
      active = false;
    };
  }, [isPublicRoute, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const isSuper = profile?.role === "super_admin";

  const churchName =
    churches.find((church) => church.id === selectedChurch)?.name ??
    "Loading location...";

  function setChurchId(id: string) {
    setSelectedChurch(id);
    saveChurch(id);
    window.location.reload();
  }

  const nav = [
    ["Dashboard", "/dashboard"],
    ["Children", "/children"],
    ["Classes", "/classes"],
    ["Attendance", "/attendance"],
    ["Follow-up", "/follow-up"],
    ["Birthdays", "/birthdays"],
    ["Import", "/import"],
    ["Notifications", "/notifications"],
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="w-full border-b bg-white md:min-h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 border-b p-4">
          <Image
            src={
              "/junior-church-logo.jpg"
            }
            alt="Church logo"
            width={52}
            height={52}
            className="h-12 w-12 rounded-lg object-contain"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              The Shelter
            </p>
            <h1 className="font-bold">
              Junior Church
            </h1>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">
              LOCATION
            </label>
            <select
              value={selectedChurch}
              onChange={(event) => setChurchId(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              disabled={!isSuper}
            >
              {churches
                .filter(
                  (church) => isSuper || church.id === profile?.church_id
                )
                .map((church) => (
                  <option key={church.id} value={church.id}>
                    {church.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {isSuper
                ? "Super Admin: all locations"
                : "Your assigned location"}
            </p>
          </div>

          <nav className="border-t pt-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              NAVIGATION
            </p>
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === href
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {(isSuper || profile?.role === "dept_head") && (
            <nav className="border-t pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">
                ADMINISTRATION
              </p>
              {isSuper && (
                <>
                  <Link
                    href="/admin/locations"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    Locations
                  </Link>
                  <Link
                    href="/admin/users"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    Users & Access
                  </Link>
                  <Link
                    href="/admin/qr"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    QR Registration
                  </Link>
                </>
              )}
              <Link
                href="/admin/settings"
                className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
              >
                Settings
              </Link>
            </nav>
          )}
        </div>

        <div className="border-t p-4">
          <p className="text-sm font-semibold">
            {profile?.full_name ?? "Loading..."}
          </p>
          <p className="mb-3 text-xs capitalize text-slate-500">
            {profile?.role?.replace("_", " ")}
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/");
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b bg-white px-6 py-3 text-sm text-slate-600">
          <span className="font-semibold">
            Junior Church
          </span>
          <span className="mx-2">/</span>
          {churchName}
        </div>
        {children}
      </div>
    </div>
  );
}
