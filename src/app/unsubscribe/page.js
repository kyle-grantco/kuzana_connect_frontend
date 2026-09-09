"use client";

// Route: /unsubscribe?token=...
// Public page (no auth) that email unsubscribe links point to. Reads the signed
// token, calls the backend to opt the member out, and shows the result. Living
// on the frontend (not linking straight to the API) keeps it same-origin.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { unsubscribeByToken } from "@/app/lib/commsService";

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState("working"); // working | done | invalid

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    unsubscribeByToken(token)
      .then((r) => setState(r?.ok ? "done" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-yellow-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 inline-flex h-9 items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-yellow text-xs font-extrabold text-brand-navy">
            K
          </span>
          <span className="text-sm font-bold text-brand-navy">
            Kuzana Connect
          </span>
        </div>

        {state === "working" && (
          <p className="text-sm text-slate-500">Updating your preferences…</p>
        )}

        {state === "done" && (
          <>
            <h1 className="mb-2 text-lg font-semibold text-brand-navy">
              You&apos;re unsubscribed
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              You won&apos;t get update emails (reminders and weekly
              suggestions). You&apos;ll still receive essential messages like
              verification codes and direct connection requests. You can turn
              updates back on anytime in your settings.
            </p>
            <Link
              href="/settings"
              className="mt-5 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-600"
            >
              Go to settings
            </Link>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="mb-2 text-lg font-semibold text-brand-navy">
              Link not valid
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              This unsubscribe link is invalid or has expired. You can manage
              email preferences in your settings.
            </p>
            <Link
              href="/settings"
              className="mt-5 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-600"
            >
              Go to settings
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-brand-yellow-50 px-4">
          <p className="text-sm text-slate-500">Loading…</p>
        </main>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
