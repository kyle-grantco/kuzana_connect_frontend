"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuthStatus, refreshSession } from "@/app/lib/api";
import { useAuthStore } from "@/app/store/authStore";
import AppShell from "@/app/components/app/AppShell";

/*
  Auth guard for the secured (app) group.
  On mount: check auth status; if it fails, try one refresh; if that also
  fails, clear auth and redirect to /auth/login.

  Place at: src/app/(app)/layout.jsx
  Everything inside (app) — the directory (/) and member profiles
  (/[app]/members/[slug]) — is protected by this. Public pages (auth/*, welcome)
  live OUTSIDE this group and are unaffected.
*/
export default function AppLayout({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { clearAuth } = useAuthStore();

  useEffect(() => {
    async function guard() {
      const authed = await checkAuthStatus();
      if (!authed) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          clearAuth();
          router.replace("/auth/login");
          return;
        }
      }
      setChecking(false);
    }
    guard();
  }, []); // eslint-disable-line

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div
          className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-brand-blue"
          style={{ animation: "spin 0.8s linear infinite" }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
