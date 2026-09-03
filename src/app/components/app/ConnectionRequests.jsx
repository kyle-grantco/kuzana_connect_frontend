"use client";

// Incoming connection requests (accept/decline) + outgoing (status).
// The dedicated surface notifications link to. Standalone so it can be placed
// on a page or in a section later.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock } from "lucide-react";
import {
  getIncomingRequests,
  getOutgoingRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
} from "@/app/lib/connectionRequestService";
import { slugify } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function ConnectionRequests() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [tab, setTab] = useState("incoming");
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, out] = await Promise.all([
        getIncomingRequests(),
        getOutgoingRequests(),
      ]);
      setIncoming(inc || []);
      setOutgoing(out || []);
    } catch {
      setIncoming([]);
      setOutgoing([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id, action, name) {
    setBusy(id);
    try {
      if (action === "accept") {
        const res = await acceptConnectionRequest(id);
        notify(
          `You're connected with ${name}. They'll be in touch, or reach out from their profile.`,
          "success",
          4000,
        );
        if (res?.i_have_no_contact) {
          notify(
            "Add your WhatsApp or email in your profile so they can reach you.",
            "info",
            5000,
          );
        }
        setIncoming((rows) =>
          rows.map((r) => (r.id === id ? { ...r, status: "accepted" } : r)),
        );
      } else {
        await declineConnectionRequest(id);
        setIncoming((rows) =>
          rows.map((r) => (r.id === id ? { ...r, status: "declined" } : r)),
        );
      }
    } catch (err) {
      notify(
        err.response?.data?.detail || "Something went wrong.",
        "error",
        3500,
      );
    } finally {
      setBusy(null);
    }
  }

  function openProfile(p) {
    if (p?.member_number)
      router.push(`/members/${slugify(p.full_name)}-${p.member_number}`);
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-50 p-1 text-xs sm:text-sm">
        <button
          onClick={() => setTab("incoming")}
          className={
            "flex-1 rounded-md px-3 py-1.5 " +
            (tab === "incoming"
              ? "bg-brand-blue font-medium text-white"
              : "text-slate-500")
          }
        >
          Received{incoming.length ? ` (${incoming.length})` : ""}
        </button>
        <button
          onClick={() => setTab("outgoing")}
          className={
            "flex-1 rounded-md px-3 py-1.5 " +
            (tab === "outgoing"
              ? "bg-brand-blue font-medium text-white"
              : "text-slate-500")
          }
        >
          Sent
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : tab === "incoming" ? (
        incoming.length === 0 ? (
          <Empty text="No connection requests yet." />
        ) : (
          <div className="space-y-3">
            {incoming.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <button
                  onClick={() => openProfile(r.requester)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar p={r.requester} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-brand-navy">
                      {r.requester?.full_name}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {[r.requester?.title, r.requester?.business_name]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </button>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {r.message}
                </p>
                {r.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() =>
                        respond(r.id, "accept", r.requester?.full_name)
                      }
                      disabled={busy === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-blue py-2 text-xs font-medium text-white hover:bg-brand-blue-600 disabled:opacity-50"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => respond(r.id, "decline")}
                      disabled={busy === r.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between">
                    {r.status === "accepted" ? (
                      <button
                        onClick={() => openProfile(r.requester)}
                        className="text-xs font-medium text-brand-blue hover:text-brand-blue-600"
                      >
                        View profile to reach out
                      </button>
                    ) : (
                      <span />
                    )}
                    <StatusPill status={r.status} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <Empty text="You haven't sent any requests yet." />
      ) : (
        <div className="space-y-2">
          {outgoing.map((r) => (
            <button
              key={r.id}
              onClick={() => openProfile(r.recipient)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-slate-300"
            >
              <Avatar p={r.recipient} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-brand-navy">
                  {r.recipient?.full_name}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {r.recipient?.title}
                </div>
              </div>
              <StatusPill status={r.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { t: "Pending", c: "bg-amber-50 text-amber-700", I: Clock },
    accepted: { t: "Connected", c: "bg-green-50 text-green-700", I: Check },
    declined: { t: "Declined", c: "bg-slate-100 text-slate-400", I: X },
  };
  const s = map[status] || map.pending;
  const I = s.I;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] " +
        s.c
      }
    >
      <I size={11} /> {s.t}
    </span>
  );
}

function Avatar({ p }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-xs font-medium text-white">
      {p?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo_url}
          alt={p.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(p?.full_name)
      )}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
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
