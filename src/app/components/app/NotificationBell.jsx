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

const POLL_MS = 60000;

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
    loadCount();
    const t = setInterval(loadCount, POLL_MS);
    return () => clearInterval(t);
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
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
