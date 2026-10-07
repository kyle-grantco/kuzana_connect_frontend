"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuthStatus } from "@/app/lib/api";
import { useAuthStore } from "@/app/store/authStore";
import { useProfileStatus } from "@/app/store/profileStatusStore";
import { getMyProfile } from "@/app/lib/profileService";
import AppShell from "@/app/components/app/AppShell";

/*
  Auth + profile-completion guard for the secured (app) group.
  On every guarded-page load:
    1. Verify auth. "dead" -> /auth/login. "transient" (server unreachable,
       5xx, rate-limited) -> an offline panel with Retry, NOT a logout: the
       session is probably fine, we just couldn't confirm it right now.
    2. Fetch the user's profile and record completion status in the store.
  Pages read useProfileStatus to lock themselves when the member hasn't
  completed their MVP profile. Because this runs on every load, a member can't
  URL-escape onboarding — any (app) route re-evaluates completion here.

  Place at: src/app/(app)/layout.js
*/
export default function AppLayout({ children }) {
  const router = useRouter();
  // "checking" | "ok" | "unreachable"
  const [state, setState] = useState("checking");
  // Bumped by the Retry button; re-runs the guard effect.
  const [attempt, setAttempt] = useState(0);
  const { clearAuth } = useAuthStore();
  const setStatus = useProfileStatus((s) => s.setStatus);

  useEffect(() => {
    async function guard() {
      // checkAuthStatus() goes through authRequest, whose response interceptor
      // ALREADY refreshes (via the shared single-flight promise) and retries on
      // a 401. This used to call the raw refresh again on failure — a second,
      // unguarded refresh that could overlap the interceptor's one; both then
      // presented the same pre-rotation token and the loser 401'd, logging the
      // user out at random. If a manual refresh is ever needed here, use
      // refreshSessionShared() — never a raw one.
      //
      // Only "dead" is terminal. "transient" used to be treated as logged-out
      // too, which is how a backend 500 on /auth/refresh (and Nginx 429s on
      // shared mobile IPs) logged the whole member base out.
      const outcome = await checkAuthStatus();
      if (outcome === "dead") {
        clearAuth();
        router.replace("/auth/login");
        return;
      }
      if (outcome === "transient") {
        setState("unreachable");
        return;
      }

      // load profile completion status for gating (+ traction for the nudge)
      try {
        const me = await getMyProfile();
        const p = me?.profile;
        setStatus({
          isSearchable: !!p?.is_searchable,
          completionStatus: p?.completion_status || "pending",
          memberNumber: me?.user?.member_number ?? null,
          fullName: me?.user?.full_name || "",
          hasTraction: !!(p?.traction && String(p.traction).trim()),
        });
      } catch {
        setStatus({ isSearchable: false, completionStatus: "pending" });
      }

      setState("ok");
    }
    guard();
  }, [attempt]); // eslint-disable-line

  if (state === "checking") {
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

  if (state === "unreachable") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-base font-semibold text-brand-navy">
            Couldn&apos;t reach Kuzana Connect
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            You&apos;re still signed in. Check your connection and try again.
          </p>
          <button
            onClick={() => {
              setState("checking");
              setAttempt((a) => a + 1);
            }}
            className="mt-5 w-full rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600"
          >
            Try again
          </button>
          <button
            onClick={() => router.replace("/auth/login")}
            className="mt-2 w-full py-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Sign in again instead
          </button>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
