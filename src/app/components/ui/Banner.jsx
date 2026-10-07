"use client";

// Reusable, prop-driven announcement banner. Shown app-wide (mounted in the
// app shell) to carry comms to members: profile nudges, announcements, updates.
//
// Styling is Kuzana Connect's own, not the generic info/warning/danger palette,
// so banners read as part of the app, not as system alerts:
//   update  - soft brand-blue. The default: "here's something useful / new".
//   accent  - brand-yellow highlight. For things to celebrate or draw the eye.
//   urgent  - brand-red. Reserved for genuinely important / action-required.
//
// Dismiss behaviour: dismissible banners hide for the SESSION (sessionStorage,
// keyed by `id`) and reappear on the next login / new session, so a persistent
// nudge keeps surfacing until the member acts, without nagging within a single
// session. Non-dismissible banners always show while their condition holds.
//
// Usage:
//   <Banner
//     id="add-traction"
//     type="update"
//     message="New: share where your business is at. It gives the people we match you with useful context."
//     ctaLabel="Add it"
//     ctaHref="/profile/edit#traction"
//   />

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles, Star, AlertCircle } from "lucide-react";

const STYLES = {
  update: {
    wrap: "border-brand-blue-100 bg-brand-blue-50 text-brand-navy",
    icon: "text-brand-blue",
    cta: "bg-brand-blue text-white hover:bg-brand-blue-600",
    Icon: Sparkles,
  },
  accent: {
    wrap: "border-brand-yellow-600/30 bg-brand-yellow-50 text-brand-navy",
    icon: "text-brand-yellow-700",
    cta: "bg-brand-navy text-white hover:opacity-90",
    Icon: Star,
  },
  urgent: {
    wrap: "border-brand-red/40 bg-brand-red/10 text-brand-navy",
    icon: "text-brand-red",
    cta: "bg-brand-red text-white hover:bg-brand-red-600",
    Icon: AlertCircle,
  },
};

export default function Banner({
  id,
  type = "update",
  message,
  ctaLabel,
  ctaHref,
  onCta, // optional click handler (alternative to ctaHref)
  dismissible = true,
  show = true, // parent controls the condition (e.g. traction empty)
}) {
  const s = STYLES[type] || STYLES.update;
  const [dismissed, setDismissed] = useState(false);

  // Restore session-dismiss on mount so it doesn't flash before hiding.
  useEffect(() => {
    if (!dismissible || !id) return;
    try {
      if (sessionStorage.getItem(`banner_dismissed:${id}`) === "1") {
        setDismissed(true);
      }
    } catch {
      // sessionStorage unavailable; just show it
    }
  }, [id, dismissible]);

  if (!show || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      if (id) sessionStorage.setItem(`banner_dismissed:${id}`, "1");
    } catch {
      // ignore
    }
  }

  const Icon = s.Icon;

  return (
    <div
      className={
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm " +
        s.wrap
      }
    >
      <Icon size={18} className={"mt-0.5 shrink-0 " + s.icon} />
      <div className="min-w-0 flex-1">
        <p className="leading-relaxed">{message}</p>
        {ctaLabel && (ctaHref || onCta) && (
          <div className="mt-2">
            {ctaHref ? (
              <Link
                href={ctaHref}
                className={
                  "inline-block rounded-lg px-3 py-1.5 text-xs font-medium " +
                  s.cta
                }
              >
                {ctaLabel}
              </Link>
            ) : (
              <button
                onClick={onCta}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium " + s.cta
                }
              >
                {ctaLabel}
              </button>
            )}
          </div>
        )}
      </div>
      {dismissible && (
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
