"use client";

// One ranked list of people Connect thinks this member should meet.
// Each card leads with the person and a short reason (the strongest match, by
// the viewer's own priority). No buy/sell split — a single, human list.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  getSuggestions,
  getMemberSuggestionsAdmin,
} from "@/app/lib/suggestionService";
import { slugify } from "@/app/lib/slug";

const VISIBLE = 6;
const VISIBLE_COMPACT = 3;

export default function SuggestionsSections({
  compact = false,
  userId = null, // admin: show THIS member's suggestions
  admin = false,
}) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d =
        admin && userId
          ? await getMemberSuggestionsAdmin(userId, { limit: 12 })
          : await getSuggestions({ limit: 12 });
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [admin, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // After a profile edit, the matching engine recomputes in the background
  // (a few seconds). If we detect the just-edited flag, show a brief "updating"
  // note and silently refetch once the recompute has had time to finish. Only
  // for the member's OWN suggestions (not the admin debug view). One-shot.
  useEffect(() => {
    if (admin) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("kc_profile_just_updated") !== "1") return;
    sessionStorage.removeItem("kc_profile_just_updated");
    setUpdating(true);
    const t = setTimeout(async () => {
      await load();
      setUpdating(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [admin, load]);

  if (loading) {
    return (
      <div className="mb-8 animate-pulse space-y-3">
        <div className="h-4 w-56 rounded bg-slate-100" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const people = data.suggestions || [];
  const visible = compact ? VISIBLE_COMPACT : VISIBLE;
  const shown = expanded ? people : people.slice(0, visible);
  const hasMore = people.length > visible;

  function open(m) {
    router.push(`/members/${slugify(m.full_name)}-${m.member_number}`);
  }

  return (
    <section className={compact ? "" : "mb-8"}>
      <h2 className="mb-1 text-sm font-semibold text-brand-navy">
        Suggested connections
      </h2>
      {updating && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" />
          Updating your suggestions after your profile change…
        </p>
      )}
      {!updating && <div className="mb-3" />}

      {people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="mx-auto max-w-sm text-sm text-slate-500">
            No suggestions yet. Explore the community below, and keep your
            profile detailed so we can match you as more founders join.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((m) => (
              <SuggestionCard key={m.member_number} m={m} onOpen={open} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-brand-blue-600"
            >
              {expanded ? "Show fewer" : `Show ${people.length - visible} more`}
              <ArrowRight size={13} />
            </button>
          )}
        </>
      )}
    </section>
  );
}

function SuggestionCard({ m, onOpen }) {
  const why = topReason(m.reasons);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(m)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(m);
      }}
      className="flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-sm font-medium text-white">
          {m.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.photo_url}
              alt={m.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(m.full_name)
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-brand-navy">
            {m.full_name}
          </div>
          <div className="truncate text-xs text-slate-400">
            {[m.title, m.business_name].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {why && (
        <div className="rounded-lg bg-brand-yellow-50 px-2.5 py-1.5 text-[11px] leading-snug text-brand-navy">
          {why}
        </div>
      )}

      {m.location && (
        <div className="mt-2 text-[11px] text-slate-400">{m.location}</div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(m);
        }}
        className="mt-3 flex w-full items-center justify-center gap-1 border-t border-slate-100 pt-2.5 text-xs font-medium text-brand-blue hover:text-brand-blue-600"
      >
        Connect <ArrowRight size={13} />
      </button>
    </div>
  );
}

// Strongest reason by the viewer's own weight (x similarity), shown as the why.
// Reasons carry both sides + direction, so we can phrase it naturally.
function topReason(reasons) {
  if (!reasons || reasons.length === 0) return null;
  const sorted = [...reasons].sort(
    (a, b) => (b.w || 0) * (b.sim || 0) - (a.w || 0) * (a.sim || 0),
  );
  const top = sorted[0];
  const theirs = (top.match || "").trim();
  if (!theirs) return null;
  // State only the OTHER member's relevant side. The match is already made; we
  // just say why they're relevant, without asserting what the viewer offers or
  // needs (that framing was sometimes inaccurate).
  //   needs direction  -> this person OFFERS the thing -> "They offer X"
  //   offers direction -> this person is LOOKING FOR the thing -> "They're looking for X"
  return top.direction === "needs"
    ? `They offer ${theirs}`
    : `They're looking for ${theirs}`;
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}
