"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuthStatus, refreshSession } from "@/app/lib/api";
import { useAuthStore } from "@/app/store/authStore";
import { useProfileStatus } from "@/app/store/profileStatusStore";
import { getMyProfile } from "@/app/lib/profileService";
import AppShell from "@/app/components/app/AppShell";

/*
  Auth + profile-completion guard for the secured (app) group.
  On every guarded-page load:
    1. Verify auth (refresh once on failure, else -> /auth/login).
    2. Fetch the user's profile and record completion status in the store.
  Pages read useProfileStatus to lock themselves when the member hasn't
  completed their MVP profile. Because this runs on every load, a member can't
  URL-escape onboarding — any (app) route re-evaluates completion here.

  Place at: src/app/(app)/layout.js
*/
export default function AppLayout({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { clearAuth } = useAuthStore();
  const setStatus = useProfileStatus((s) => s.setStatus);

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

      // load profile completion status for gating
      try {
        const me = await getMyProfile();
        const p = me?.profile;
        setStatus({
          isSearchable: !!p?.is_searchable,
          completionStatus: p?.completion_status || "pending",
          memberNumber: me?.user?.member_number ?? null,
          fullName: me?.user?.full_name || "",
        });
      } catch {
        setStatus({ isSearchable: false, completionStatus: "pending" });
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
