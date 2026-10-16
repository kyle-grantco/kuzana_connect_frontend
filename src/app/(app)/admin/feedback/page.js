"use client";

// Route: /admin/feedback
// Detailed connection-feedback view: every submitted ('given') feedback, newest
// first — who rated whom, whether they engaged, the 1-5 score, and the rater's
// own words. The members' notes here are what eventually feed the public
// proof-of-connections; for now it's admin-only insight into what connections
// are actually producing.

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { listConnectionFeedback } from "@/app/lib/adminService";

function Stars({ score }) {
  if (score == null) return <span className="text-slate-300">—</span>;
  return (
    <span className="font-medium text-brand-navy">
      {score}
      <span className="text-slate-400">/5</span>
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(50);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (toPage = 1) => {
      setLoading(true);
      try {
        const data = await listConnectionFeedback({ page: toPage, size });
        setRows(data.results || []);
        setTotal(data.total || 0);
        setPage(data.page || toPage);
      } catch {
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [size],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  function fmt(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function name(p) {
    if (!p) return "—";
    return p.member_number != null
      ? `${p.full_name} · #${p.member_number}`
      : p.full_name;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-brand-navy">
          Connection feedback
        </h1>
        <button
          onClick={() => load(page)}
          disabled={loading}
          aria-label="Refresh"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-3 text-xs text-slate-500">{total} responses</div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No feedback submitted yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Rater</th>
                  <th className="px-4 py-2.5"></th>
                  <th className="px-4 py-2.5">Connection</th>
                  <th className="px-4 py-2.5">Engaged</th>
                  <th className="px-4 py-2.5">Score</th>
                  <th className="px-4 py-2.5">In their words</th>
                  <th className="px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 align-top last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-brand-navy">
                      {name(r.rater)}
                    </td>
                    <td className="px-2 py-2.5 text-slate-300">
                      <ArrowRight size={14} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-brand-navy">
                      {name(r.other)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.engaged ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700">
                          yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          not yet
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Stars score={r.score} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {r.note ? (
                        <span className="block max-w-xs whitespace-pre-wrap">
                          {r.note}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {fmt(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => page > 1 && load(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              onClick={() => page < totalPages && load(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
