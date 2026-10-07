"use client";

import Link from "next/link";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getMetrics } from "@/app/lib/adminService";
import MetricCard from "@/app/components/admin/MetricCard";

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
    eng = m.engagement || {},
    comms = m.comms;

  // seeds let the period cards render their default value without an extra fetch
  const nm = a.new_members || {};
  const newSeed = {
    today: nm.today ?? 0,
    this_week: nm.week ?? 0,
    this_month: nm.month ?? 0,
  };
  const activeSeed = {
    today: eng.dau ?? 0,
    this_week: eng.wau ?? 0,
    this_month: eng.mau ?? 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {/* Accounts */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Accounts</h2>

        {/* New members — three fixed cards, each with its own period dropdown */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:max-w-2xl">
          <MetricCard
            label="New members"
            metric="new_members"
            options={["today", "yesterday"]}
            initial="today"
            seed={newSeed}
          />
          <MetricCard
            label="New members"
            metric="new_members"
            options={["this_week", "last_week"]}
            initial="this_week"
            seed={newSeed}
          />
          <MetricCard
            label="New members"
            metric="new_members"
            options={["this_month"]}
            initial="this_month"
            monthsBack={6}
            allowCustom
            seed={newSeed}
          />
        </div>

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

      {/* Engagement (active users) — fixed cards, each with its own period */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Engagement
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Online now"
            value={eng.online_now ?? 0}
            sub="active in last 5 min"
          />
          <MetricCard
            label="Active"
            metric="active"
            options={["today", "yesterday"]}
            initial="today"
            seed={activeSeed}
          />
          <MetricCard
            label="Active"
            metric="active"
            options={["this_week", "last_week"]}
            initial="this_week"
            seed={activeSeed}
          />
          <Stat
            label="Returning (WAU)"
            value={eng.returning_wau ?? 0}
            pct={eng.returning_pct ?? null}
            sub="of weekly actives (joined > 7d ago)"
          />
          <Stat
            label="Stickiness"
            value={eng.stickiness_pct == null ? "—" : eng.stickiness_pct + "%"}
            sub="weekly actives ÷ all members"
          />
          <MetricCard
            label="Active"
            metric="active"
            options={["this_month"]}
            initial="this_month"
            monthsBack={6}
            allowCustom
            seed={activeSeed}
          />
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
          <Stat
            label="With traction"
            value={p.with_traction?.count ?? 0}
            pct={p.with_traction?.pct ?? null}
            sub="added their traction"
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
              label="Total emails"
              value={comms.total_emails}
              sub="all emails sent, all time"
            />
            <Stat
              label="Request reminders"
              value={comms.total_reminders}
              sub="pending requests reminded"
            />
            <Stat
              label="Suggestion emails"
              value={comms.total_suggestions}
              sub="weekly suggestions / explore"
            />
            <Stat
              label="Connection nudges"
              value={comms.total_nudges}
              sub="post-connection follow-ups"
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
