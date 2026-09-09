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
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
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
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 " +
          (on ? "bg-brand-blue" : "bg-slate-300")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
            (on ? "translate-x-[22px]" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}
