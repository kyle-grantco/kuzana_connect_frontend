"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { getMyProfile } from "@/app/lib/profileService";

// Admin area layout. Confirms the user is admin/super_admin (backend enforces
// on every call regardless; this just avoids showing the UI to non-admins).
// Provides the "back to platform" switcher.
// Place at: src/app/(app)/admin/layout.js
export default function AdminLayout({ children }) {
  const router = useRouter();
  const [state, setState] = useState("checking"); // checking | ok | denied

  useEffect(() => {
    getMyProfile()
      .then((me) => {
        const role = me?.user?.role;
        setState(role === "admin" || role === "super_admin" ? "ok" : "denied");
      })
      .catch(() => setState("denied"));
  }, []);

  if (state === "checking") {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }
  if (state === "denied") {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">
          You don&apos;t have access to this area.
        </p>
        <button
          onClick={() => router.replace("/")}
          className="mt-3 text-sm text-brand-blue"
        >
          Back to platform
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* admin sub-nav + switch back to normal platform view */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-600 hover:bg-white"
          >
            <LayoutDashboard size={14} /> Overview
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-600 hover:bg-white"
          >
            <UsersIcon size={14} /> Members
          </Link>
        </div>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300"
        >
          <ArrowLeft size={13} /> Platform view
        </button>
      </div>
      {children}
    </div>
  );
}
