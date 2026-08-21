"use client";

// src/app/invite/[token]/InviteClient.jsx
//
// Client half of the invite landing. Validates the token live against
// /invites/check/{token}, then either:
//   valid    -> show inviter identity + "Accept invitation" -> /auth/register?invite={token}
//   invalid  -> "This invite link isn't valid."
//   used     -> "This invitation has already been used."
//   cancelled-> "This invitation is no longer active."
// The token is mirrored to sessionStorage on Continue as a fallback; the URL
// query param on the register route is the source of truth.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import { checkInviteToken } from "@/app/lib/authService";
import { setPendingInvite } from "@/app/lib/pendingInvite";

const REASON_COPY = {
  invalid: {
    title: "This invite link isn't valid",
    body: "The link may be mistyped or broken. Ask the person who invited you to send it again.",
  },
  used: {
    title: "This invitation has already been used",
    body: "Each invite works once. If you already have an account, log in. Otherwise ask for a fresh invite.",
  },
  cancelled: {
    title: "This invitation is no longer active",
    body: "The person who invited you cancelled this link. Ask them for a new one.",
  },
};

export default function InviteClient({ token }) {
  const router = useRouter();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await checkInviteToken(token);
        if (!alive) return;
        if (data?.valid) {
          setState({ status: "valid", inviter: data });
        } else {
          setState({ status: "invalid", reason: data?.reason || "invalid" });
        }
      } catch {
        if (alive) setState({ status: "invalid", reason: "invalid" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  function accept() {
    setPendingInvite(token); // fallback mirror
    router.push(`/auth/register?invite=${encodeURIComponent(token)}`);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-10">
      <div className="w-full max-w-sm">
        {state.status === "loading" && (
          <div className="text-center text-sm text-slate-400">
            Checking your invitation…
          </div>
        )}

        {state.status === "valid" && (
          <div className="text-center">
            {state.inviter.inviter_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.inviter.inviter_photo_url}
                alt={state.inviter.inviter_name || "Your inviter"}
                className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-yellow-100 text-2xl font-semibold text-brand-navy">
                {(state.inviter.inviter_name || "?").charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="text-lg font-semibold text-brand-navy">
              {state.inviter.inviter_name
                ? `${state.inviter.inviter_name} invited you to join`
                : "You've been invited to join"}
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
              Kuzana Connect, a trusted network of entrepreneurs.
            </p>

            <div className="mt-6">
              <Button onClick={accept}>Accept invitation</Button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Already a member?{" "}
              <a
                href="/auth/login"
                className="text-brand-blue hover:text-brand-blue-600"
              >
                Log in
              </a>
            </p>
          </div>
        )}

        {state.status === "invalid" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              {/* simple broken-link glyph */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-brand-navy">
              {(REASON_COPY[state.reason] || REASON_COPY.invalid).title}
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
              {(REASON_COPY[state.reason] || REASON_COPY.invalid).body}
            </p>
            <p className="mt-6 text-xs text-slate-400">
              Already a member?{" "}
              <a
                href="/auth/login"
                className="text-brand-blue hover:text-brand-blue-600"
              >
                Log in
              </a>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
