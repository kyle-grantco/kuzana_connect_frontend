"use client";

// The bell. Shows unread count; opens a popover of recent notifications; each
// links to the right place (requests view, or a member profile). Standalone so
// it can be dropped into the top nav wherever that lands.

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { slugify } from "@/app/lib/slug";
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@/app/lib/connectionRequestService";

// Poll slowly, and ONLY while the tab is visible and the window focused. An
// idle tab must make no requests: the old 60s poll from background tabs forced
// a token refresh every 15 minutes forever (refresh ran ~6x more often than page
// loads), kept sessions alive indefinitely, and marked members "active" for the
// day without them doing anything. Notifications here are low-volume (connection
// requests / accepts) and every one is also emailed, so a 5-minute cadence while
// the user is actually looking is plenty; coming back to the tab fetches once.
const POLL_MS = 5 * 60 * 1000;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadCount = useCallback(async () => {
    try {
      const { count } = await getUnreadCount();
      setCount(count || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let timer = null;
    const isActive = () =>
      document.visibilityState === "visible" && document.hasFocus();
    const start = () => {
      if (!timer) timer = setInterval(loadCount, POLL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    // Tab/window came back -> fetch once so the badge is current, then resume
    // polling. Went away -> stop entirely.
    const onChange = () => {
      if (isActive()) {
        loadCount();
        start();
      } else {
        stop();
      }
    };

    // One fetch per page load is fine; it's the idle repeats we drop. Deferred
    // to a callback (not called synchronously in the effect body) per the
    // react-hooks/set-state-in-effect rule.
    const initial = setTimeout(loadCount, 0);
    if (isActive()) start();
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("focus", onChange);
    window.addEventListener("blur", onChange);
    return () => {
      clearTimeout(initial);
      stop();
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("focus", onChange);
      window.removeEventListener("blur", onChange);
    };
  }, [loadCount]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const list = await getNotifications({ limit: 20 });
        setItems(list || []);
        // opening marks all read
        if (count > 0) {
          await markNotificationsRead();
          setCount(0);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  }

  function go(n) {
    setOpen(false);
    // accepted / member-centric notifications route to the member's profile,
    // built from the actor (correct slug route). Others use the stored link.
    if (n.type === "request_accepted" && n.actor?.member_number) {
      router.push(
        `/members/${slugify(n.actor.full_name || "")}-${n.actor.member_number}`,
      );
    } else if (n.link) {
      router.push(n.link);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-3 left-3 top-16 z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-brand-navy">
            Notifications
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Nothing yet.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n)}
                  className={
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 " +
                    (n.is_read ? "" : "bg-brand-blue-50/40")
                  }
                >
                  <Avatar actor={n.actor} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-slate-700">
                      {n.text}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ actor }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-[11px] font-medium text-white">
      {actor?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={actor.photo_url}
          alt={actor.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(actor?.full_name)
      )}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
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
