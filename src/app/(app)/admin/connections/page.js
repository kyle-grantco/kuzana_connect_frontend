"use client";

// Route: /admin/connections
// The full connection-request activity: who requested whom, status, when.
// The real "is the loop working" view. Names link to member profiles.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { listConnectionRequests } from "@/app/lib/adminService";
import { slugify } from "@/app/lib/slug";

const STATUS_TABS = ["all", "pending", "accepted", "declined"];
const statusStyle = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-slate-100 text-slate-500",
};

export default function AdminConnectionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (toPage = 1) => {
      setLoading(true);
      try {
        const data = await listConnectionRequests({
          status: status === "all" ? undefined : status,
          page: toPage,
          size,
        });
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
    [status, size],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  function openProfile(p) {
    if (p?.member_number)
      router.push(
        `/members/${slugify(p.full_name)}-${p.member_number}?from=admin`,
      );
  }

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
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setStatus(t)}
              className={
                "shrink-0 rounded-md px-3 py-1.5 capitalize " +
                (status === t
                  ? "bg-white font-medium text-brand-navy"
                  : "text-slate-500")
              }
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          aria-label="Refresh"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-3 text-xs text-slate-500">{total} requests</div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No connection requests{status !== "all" ? ` (${status})` : ""} yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Requester</th>
                  <th className="px-4 py-2.5"></th>
                  <th className="px-4 py-2.5">Recipient</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Sent</th>
                  <th className="px-4 py-2.5">Responded</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => openProfile(r.requester)}
                        className="text-left font-medium text-brand-navy hover:text-brand-blue"
                      >
                        {r.requester?.full_name || "—"}
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-slate-300">
                      <ArrowRight size={14} />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => openProfile(r.recipient)}
                        className="text-left font-medium text-brand-navy hover:text-brand-blue"
                      >
                        {r.recipient?.full_name || "—"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] " +
                          (statusStyle[r.status] ||
                            "bg-slate-100 text-slate-600")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {fmt(r.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {fmt(r.responded_at)}
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
