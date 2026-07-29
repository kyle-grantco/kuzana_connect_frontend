"use client";

import { useEffect, useState } from "react";
import { getMetrics } from "@/app/lib/adminService";

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold text-brand-navy">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
      {sub != null && (
        <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [m, setM] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getMetrics()
      .then(setM)
      .catch(() => setErr("Couldn't load metrics."));
  }, []);

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
    s = m.search;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Accounts</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Total accounts" value={a.total} />
          <Stat label="Active" value={a.active} />
          <Stat label="Pending" value={a.pending} />
          <Stat label="Suspended" value={a.suspended} />
          <Stat label="Deleted" value={a.deleted} />
          <Stat
            label="Verified"
            value={a.verified}
            sub={`${a.verification_rate}% verification rate`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Profiles / onboarding
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Searchable" value={p.searchable} />
          <Stat label="MVP (searchable, not full)" value={p.mvp} />
          <Stat label="Fully complete" value={p.done} />
          <Stat label="Not started (pending)" value={p.pending} />
          <Stat
            label="MVP completion"
            value={`${p.mvp_completion_rate}%`}
            sub="of active accounts"
          />
          <Stat
            label="Full completion"
            value={`${p.full_completion_rate}%`}
            sub="of active accounts"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Search</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total searches" value={s.total_searches} />
          <Stat label="Zero-result searches" value={s.zero_result} />
        </div>
        {s.top_terms?.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-slate-500">
              Top search terms
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

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Contact preferences
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Share WhatsApp" value={m.contact_prefs.share_whatsapp} />
          <Stat label="Share Email" value={m.contact_prefs.share_email} />
        </div>
      </section>
    </div>
  );
}
