"use client";

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
    conn = m.connections;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-1 flex items-center justify-between">
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
        <p className="mb-3 text-xs text-slate-400">
          Everyone who has registered.
        </p>
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

      {/* ── Invites: the growth loop ─────────────────────────────────────── */}
      {inv && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-500">Invites</h2>
          <p className="mb-3 text-xs text-slate-400">
            The invite loop. Conversion is joined out of all invites sent
            (excluding cancelled).
          </p>
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

      {/* ── Connections: the core value metric ───────────────────────────── */}
      {conn && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-500">
            Connections
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            When a member connects with another to reveal their contact and
            reach out. The core measure of connections made.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="Total connections"
              value={conn.total}
              sub="times a member connected with another"
            />
            <Stat
              label="Active connectors"
              value={conn.active_connectors}
              sub="members who reached out ≥ 1"
            />
            <Stat
              label="Members reached"
              value={conn.reached_members}
              sub="members connected with ≥ 1 time"
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-500">Profiles</h2>
        <p className="mb-3 text-xs text-slate-400">
          Onboarding progress of active members. Percentages are of active
          accounts.
        </p>
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

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Search</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total searches" value={s.total_searches} />
          <Stat label="No results" value={s.zero_result} />
        </div>
        {s.top_terms?.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-xs font-semibold text-slate-500">
              Most-searched terms
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              How many times each exact phrase was searched.
            </p>
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

      {m.industry_distribution?.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-slate-500">
            Members by industry
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            Number of members in each industry.
          </p>
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

      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-500">
          Contact preferences
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          How many members allow each contact method.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Allow WhatsApp"
            value={m.contact_prefs.share_whatsapp}
            sub="reachable via WhatsApp"
          />
          <Stat
            label="Allow Email"
            value={m.contact_prefs.share_email}
            sub="reachable via email"
          />
        </div>
      </section>
    </div>
  );
}
