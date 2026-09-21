"use client";

import Link from "next/link";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getMetrics } from "@/app/lib/adminService";

function Stat({ label, value, sub, pct, soon }) {
  return (
    <div
      className={
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm " +
        (soon ? "opacity-50" : "")
      }
    >
      <div className="text-2xl font-semibold text-brand-navy">
        {soon ? "—" : value}
        {!soon && pct != null && (
          <span className="ml-1.5 text-sm font-medium text-slate-400">
            ({pct}%)
          </span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
      {soon ? (
        <div className="mt-1 text-[11px] italic text-slate-400">
          coming soon
        </div>
      ) : (
        sub != null && (
          <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
        )
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [m, setM] = useState(null);
  const [err, setErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [newPeriod, setNewPeriod] = useState("week"); // day | week | month

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getMetrics();
      setM(data);
      setErr("");
    } catch {
      setErr("Couldn't load metrics.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (err)
    return <p className="py-12 text-center text-sm text-brand-red">{err}</p>;
  if (!m)
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        Loading metrics…
      </p>
    );

  const a = m.accounts,
    p = m.profiles,
    s = m.search,
    inv = m.invites,
    req = m.connection_requests,
    fb = m.connection_feedback,
    comms = m.comms;

  return (
    <div className="space-y-8">
      {/* Accounts */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Accounts</h2>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
        {a.new_members && (
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-2xl font-semibold text-brand-navy">
                {a.new_members[newPeriod]}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">New members</div>
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              {["day", "week", "month"].map((per) => (
                <button
                  key={per}
                  onClick={() => setNewPeriod(per)}
                  className={
                    "rounded-md px-2.5 py-1 capitalize " +
                    (newPeriod === per
                      ? "bg-white font-medium text-brand-navy"
                      : "text-slate-500")
                  }
                >
                  {per}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat
            label="Registered"
            value={a.total}
            sub="all accounts ever created"
          />
          <Stat
            label="Active"
            value={a.active}
            sub="verified and in good standing"
          />
          <Stat
            label="Pending"
            value={a.pending}
            sub="registered but never verified"
          />
          <Stat
            label="Suspended"
            value={a.suspended}
            sub="blocked by an admin"
          />
          <Stat label="Deleted" value={a.deleted} sub="removed accounts" />
          <Stat label="Logged in" soon />
        </div>
      </section>

      {/* Connection activity */}
      {req && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Connection activity
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Requests sent"
              value={req.total}
              sub="all connection requests"
            />
            <Stat
              label="Accepted"
              value={req.accepted}
              pct={req.acceptance_rate}
              sub="of all sent (became connections)"
            />
            <Stat
              label="Pending"
              value={req.pending}
              sub="awaiting a response"
            />
            <Stat label="Declined" value={req.declined} sub="turned down" />
          </div>
        </section>
      )}

      {/* Connection feedback */}
      {fb && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Connection feedback
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Responses"
              value={fb.responses}
              sub="feedback submitted"
            />
            <Stat label="Useful" value={fb.useful} sub="confirmed useful" />
            <Stat
              label="Reached out"
              value={fb.reached_out}
              sub="actually made contact"
            />
            <Stat
              label="Avg relevance"
              value={fb.avg_relevance == null ? "—" : fb.avg_relevance}
              sub="match quality (1-5)"
            />
          </div>
        </section>
      )}

      {/* Profiles */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Profiles</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Fully complete" value={p.done.count} pct={p.done.pct} />
          <Stat
            label="Basic only"
            value={p.mvp.count}
            pct={p.mvp.pct}
            sub="core profile done, extras skipped"
          />
          <Stat
            label="Not started"
            value={p.not_completed.count}
            pct={p.not_completed.pct}
            sub="no usable profile yet"
          />
          <Stat
            label="Discoverable"
            value={p.searchable.count}
            pct={p.searchable.pct}
            sub="basic + fully complete"
          />
        </div>
      </section>

      {/* Invites */}
      {inv && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Invites</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Total" value={inv.total} sub="all invites created" />
            <Stat
              label="Joined"
              value={inv.joined}
              pct={inv.conversion}
              sub="accepted and became members"
            />
            <Stat
              label="Pending"
              value={inv.pending}
              sub="sent, not yet joined"
            />
            <Stat
              label="Cancelled"
              value={inv.cancelled}
              sub="revoked by the inviter"
            />
            <Stat
              label="Active inviters"
              value={inv.active_inviters}
              sub="members who invited ≥ 1"
            />
          </div>
        </section>
      )}

      {/* Search */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Search</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total searches" value={s.total_searches} />
          <Stat label="No results" value={s.zero_result} />
        </div>
        {s.top_terms?.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-slate-500">
              Most-searched terms
            </div>
            <div className="flex flex-wrap gap-2">
              {s.top_terms.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {t.term} <span className="text-slate-400">×{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Members by industry */}
      {m.industry_distribution?.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Members by industry
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {m.industry_distribution
                .sort((x, y) => y.count - x.count)
                .map((d, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-brand-blue-50 px-3 py-1 text-xs text-brand-blue-700"
                  >
                    {d.industry} <span className="opacity-60">×{d.count}</span>
                  </span>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Scheduled emails (ops; least critical, kept at the bottom) */}
      {comms && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Scheduled emails
          </h2>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Emails sent"
              value={comms.total_emails}
              sub="all time"
            />
            <Stat
              label="Reminders"
              value={comms.total_reminders}
              sub="requests reminded"
            />
            <Stat
              label="Suggestions"
              value={comms.total_suggestions}
              sub="suggestion / explore emails"
            />
            <Stat
              label="Nudges"
              value={comms.total_nudges}
              sub="connection follow-ups"
            />
          </div>
          <Link
            href="/admin/comms"
            className="inline-block text-xs font-medium text-brand-blue hover:underline"
          >
            View all email runs &rarr;
          </Link>
        </section>
      )}
    </div>
  );
}
