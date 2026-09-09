"use client";

// Email updates on/off toggle. Self-contained: fetches the member's current
// preference and lets them turn scheduled update emails (reminders, weekly
// suggestions) on or off. Essential emails (verification codes, direct
// connection requests) are unaffected. Drop this anywhere — e.g. the edit
// profile page or a settings section.

import { useEffect, useState } from "react";
import { getCommsPrefs, setCommsPrefs } from "@/app/lib/commsService";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function EmailPrefToggle() {
  const { notify } = useNotificationStore();
  const [optOut, setOptOut] = useState(null); // null = loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCommsPrefs()
      .then((d) => setOptOut(!!d.email_opt_out))
      .catch(() => setOptOut(false));
  }, []);

  async function toggle() {
    const next = !optOut;
    setSaving(true);
    setOptOut(next); // optimistic
    try {
      await setCommsPrefs(next);
      notify(
        next ? "Update emails turned off." : "Update emails turned on.",
        "success",
        2500,
      );
    } catch {
      setOptOut(!next); // revert
      notify("Couldn't save. Please try again.", "error", 3000);
    } finally {
      setSaving(false);
    }
  }

  if (optOut === null) return null;

  const on = !optOut; // "on" = receiving updates

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <div className="text-sm font-medium text-brand-navy">Update emails</div>
        <p className="mt-0.5 text-xs text-slate-400">
          Reminders and weekly suggestions. Verification codes and direct
          connection requests always come through.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={saving}
        className={
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 " +
          (on
            ? "border-brand-blue bg-brand-blue"
            : "border-slate-300 bg-slate-200")
        }
      >
        <span
          className={
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform " +
            (on ? "translate-x-[22px]" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}
