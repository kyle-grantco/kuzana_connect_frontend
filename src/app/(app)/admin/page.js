"use client";

import Link from "next/link";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getMetrics } from "@/app/lib/adminService";
import MetricCard from "@/app/components/admin/MetricCard";
import ActivationCard from "@/app/components/admin/ActivationCard";

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
  // bumped on every load/refresh so the period cards (MetricCard/ActivationCard)
  // refetch too — they fetch independently of getMetrics.
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getMetrics();
      setM(data);
      setRefreshKey((k) => k + 1);
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
    conn = m.connections,
    fb = m.connection_feedback,
    cq = m.connection_quality,
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
  // discoverable seed: the all-time searchable count isn't period-matched, so
  // the activation cards fetch their own values; no seed passed (they load live).

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

        {/* New members + how many became discoverable, one card per period.
            Shows "new / discoverable (activation %)" so acquisition and
            activation read together without doubling the card count. */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:max-w-2xl">
          <ActivationCard
            options={["today", "yesterday"]}
            initial="today"
            refreshKey={refreshKey}
          />
          <ActivationCard
            options={["this_week", "last_week"]}
            initial="this_week"
            refreshKey={refreshKey}
          />
          <ActivationCard
            options={["this_month"]}
            initial="this_month"
            monthsBack={6}
            allowCustom
            refreshKey={refreshKey}
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
            label="Discoverable"
            value={p.searchable.count}
            pct={p.searchable.pct}
            sub="active with a usable profile"
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
            refreshKey={refreshKey}
          />
          <MetricCard
            label="Active"
            metric="active"
            options={["this_week", "last_week"]}
            initial="this_week"
            seed={activeSeed}
            refreshKey={refreshKey}
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
            refreshKey={refreshKey}
          />
        </div>
      </section>

      {/* Connection activity — period-aware so the rate can be read against
          absolute volume (requests vs accepts over the same window), and pending
          split by age to tell a fresh backlog (lag) from a stale one (a leak). */}
      {req && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Connection activity
          </h2>

          {/* per-period cards: requested vs accepted over the same window */}
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
            <MetricCard
              label="Requests sent"
              metric="connections_requested"
              options={["today", "this_week", "last_week"]}
              initial="this_week"
              monthsBack={3}
              allowCustom
              refreshKey={refreshKey}
            />
            <MetricCard
              label="Accepted"
              metric="connections_accepted"
              options={["today", "this_week", "last_week"]}
              initial="this_week"
              monthsBack={3}
              allowCustom
              refreshKey={refreshKey}
            />
          </div>

          {/* all-time totals + pending-by-age */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Requests sent" value={req.total} sub="all time" />
            <Stat
              label="Accepted"
              value={req.accepted}
              pct={req.acceptance_rate}
              sub="all time"
            />
            <Stat
              label="Pending"
              value={req.pending}
              sub="awaiting a response"
            />
            <Stat
              label="Pending (fresh)"
              value={req.pending_fresh ?? 0}
              sub="sent in last 7 days"
            />
            <Stat
              label="Pending (stale)"
              value={req.pending_stale ?? 0}
              sub="older than 7 days"
            />
            <Stat label="Declined" value={req.declined} sub="turned down" />
            <Stat
              label="Initiators"
              value={req.active_requesters ?? 0}
              pct={
                p.searchable.count
                  ? Math.round(
                      ((req.active_requesters ?? 0) / p.searchable.count) *
                        1000,
                    ) / 10
                  : null
              }
              sub="members who sent ≥ 1 request (the drivers)"
            />
            <Stat
              label="Targeted"
              value={conn?.targeted ?? 0}
              pct={
                p.searchable.count
                  ? Math.round(
                      ((conn?.targeted ?? 0) / p.searchable.count) * 1000,
                    ) / 10
                  : null
              }
              sub="members who received ≥ 1 request (in demand)"
            />
            <Stat
              label="Connected (any side)"
              value={conn?.active_connectors ?? 0}
              pct={
                p.searchable.count
                  ? Math.round(
                      ((conn?.active_connectors ?? 0) / p.searchable.count) *
                        1000,
                    ) / 10
                  : null
              }
              sub="in ≥ 1 connection, sent or accepted"
            />
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
            <Stat
              label="Engaged"
              value={fb.engaged}
              pct={fb.engagement_rate}
              sub="reached out / connected"
            />
            <Stat
              label="Not engaged"
              value={fb.not_engaged}
              sub="hadn't reached out yet"
            />
            <Stat
              label="Avg score"
              value={fb.avg_score == null ? "—" : fb.avg_score}
              sub="usefulness (1-5), engaged only"
            />
          </div>
          <Link
            href="/admin/feedback"
            className="mt-3 inline-block text-xs font-medium text-brand-blue hover:underline"
          >
            View all feedback &rarr;
          </Link>
        </section>
      )}

      {/* Connection quality — grouped BY CONNECTION (not per response). The
          real number: of connections rated, how many are useful. */}
      {cq && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Connection quality
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              label="Rated"
              value={cq.rated}
              sub="connections with a score"
            />
            <Stat
              label="Useful"
              value={cq.useful}
              pct={cq.useful_rate}
              sub="score ≥ 4"
            />
            <Stat label="Moderate" value={cq.moderate} sub="score = 3" />
            <Stat label="Not useful" value={cq.not_useful} sub="score < 3" />
            <Stat
              label="Both rated"
              value={cq.both_rated}
              sub="both parties scored"
            />
            <Stat
              label="Avg quality"
              value={cq.avg_quality == null ? "—" : cq.avg_quality}
              sub="avg connection score"
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
