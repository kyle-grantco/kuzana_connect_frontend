"use client";

// Route: /admin/comms
// Per-run breakdown of the scheduled email job (newest first, paginated).
// The overview totals live on the main dashboard; this is the full history.

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { listCommsRuns } from "@/app/lib/adminService";

export default function AdminCommsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (toPage = 1) => {
      setLoading(true);
      try {
        const data = await listCommsRuns({ page: toPage, size });
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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-brand-navy">Email runs</h1>
        <button
          onClick={() => load(page)}
          disabled={loading}
          aria-label="Refresh"
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Each scheduled run of the daily email job and what it sent. {total}{" "}
        runs.
      </p>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No email runs yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Run</th>
                  <th className="px-4 py-2.5">Emails</th>
                  <th className="px-4 py-2.5">Reminders</th>
                  <th className="px-4 py-2.5">Suggestions</th>
                  <th className="px-4 py-2.5">New members</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {fmt(r.ran_at)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-brand-navy">
                      {r.emails_sent}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {r.reminders_sent}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {r.suggestions_sent}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {r.new_members}
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
