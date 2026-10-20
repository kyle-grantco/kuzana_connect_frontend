"use client";

// Reusable, prop-driven announcement banner. Shown app-wide (mounted in the
// app shell) to carry comms to members: profile nudges, announcements, updates.
//
// Styling is Kuzana Connect's own, not the generic info/warning/danger palette,
// so banners read as part of the app, not as system alerts:
//   important - soft brand-blue + left accent bar + icon. Same comms palette as
//               `update`; urgency comes from emphasis, not a new colour (yellow
//               is reserved for vouch counts).
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
import { X, AlertCircle } from "lucide-react";

const STYLES = {
  important: {
    wrap: "border-brand-blue-100 border-l-4 border-l-brand-blue bg-brand-blue-50 text-brand-navy",
    icon: "text-brand-blue",
    cta: "bg-brand-blue text-white hover:bg-brand-blue-600",
    Icon: null,
  },
  update: {
    wrap: "border-brand-blue-100 bg-brand-blue-50 text-brand-navy",
    icon: "text-brand-blue",
    cta: "bg-brand-blue text-white hover:bg-brand-blue-600",
    Icon: null,
  },
  // Uses the same subtle tone as suggestion "reason" chips (brand-yellow-50 +
  // navy text), which already appears across the app, so it matches rather than
  // introducing a new colour. CTA is the standard app blue.
  feedback: {
    wrap: "border-brand-yellow-100 bg-brand-yellow-50 text-brand-navy",
    icon: "text-brand-navy",
    cta: "bg-brand-blue text-white hover:bg-brand-blue-600",
    Icon: null,
  },
  accent: {
    wrap: "border-brand-yellow-600/30 bg-brand-yellow-50 text-brand-navy",
    icon: "text-brand-yellow-700",
    cta: "bg-brand-navy text-white hover:opacity-90",
    Icon: null,
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
  onDismiss, // optional: lets a parent move on to the next banner
  icon, // optional lucide icon component, overrides the type's default
  dismissible = true,
  show = true, // parent controls the condition (e.g. traction empty)
}) {
  const s = STYLES[type] || STYLES.update;
  const [dismissed, setDismissed] = useState(false);
  // Don't render until the dismissed flag has been checked, so a dismissed
  // banner never flashes on load.
  const [checked, setChecked] = useState(!dismissible || !id);

  // Restore dismiss on mount so it doesn't flash before hiding. Uses
  // localStorage (NOT sessionStorage): the installed PWA fully closes between
  // uses, which clears sessionStorage and made the banner reappear on every
  // launch. localStorage persists; the flag is cleared at login (see
  // clearDismissedBanners) so the banner reappears next login as intended.
  useEffect(() => {
    if (!dismissible || !id) return;
    setDismissed(isBannerDismissed(id));
    setChecked(true);
  }, [id, dismissible]);

  if (!show || dismissed || !checked) return null;

  function dismiss() {
    setDismissed(true);
    try {
      if (id) localStorage.setItem(`banner_dismissed:${id}`, "1");
    } catch {
      // ignore
    }
    onDismiss?.();
  }

  const Icon = icon || s.Icon;

  return (
    <div
      className={
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm " +
        s.wrap
      }
    >
      {Icon && <Icon size={18} className={"mt-0.5 shrink-0 " + s.icon} />}
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

// Whether a dismissible banner was dismissed this login (false if storage is
// unavailable, so it just shows).
export function isBannerDismissed(id) {
  try {
    return localStorage.getItem(`banner_dismissed:${id}`) === "1";
  } catch {
    return false;
  }
}

// Call at login so dismissed banners reappear in the new session. Clears every
// localStorage banner_dismissed:* flag.
export function clearDismissedBanners() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("banner_dismissed:")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
