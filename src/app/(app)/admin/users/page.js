"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  listUsers,
  suspendUser,
  activateUser,
  deleteUser,
  setUserRole,
  adminViewUser,
  getMetrics,
} from "@/app/lib/adminService";
import { getMyProfile } from "@/app/lib/profileService";
import { slugify } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";

const STATUS_TABS = ["all", "active", "pending", "suspended", "deleted"];
const SIZE_OPTIONS = [20, 50, 100];

const statusStyle = {
  active: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  suspended: "bg-orange-50 text-orange-700",
  deleted: "bg-red-50 text-red-700",
};

export default function AdminMembersPage() {
  const { notify } = useNotificationStore();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getMyProfile()
      .then((me) => setIsSuper(me?.user?.role === "super_admin"))
      .catch(() => {});
  }, []);

  // load a specific page (defaults to current `page`)
  const load = useCallback(
    async (toPage = page) => {
      setLoading(true);
      try {
        const data = await listUsers({
          status: status === "all" ? undefined : status,
          q: q.trim(),
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
    [status, q, size, page],
  );

  // Reload from page 1 whenever the filter/search-size context changes.
  // (Search itself also submits via the form handler below.)
  useEffect(() => {
    load(1);
  }, [status, size]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  function goPrev() {
    if (page > 1) load(page - 1);
  }
  function goNext() {
    if (page < totalPages) load(page + 1);
  }

  async function act(fn, memberNumber, okMsg) {
    try {
      await fn(memberNumber);
      notify(okMsg, "success", 2500);
      load(); // stay on current page
    } catch (e) {
      notify(e.response?.data?.detail || "Action failed.", "error", 3500);
    }
  }

  return (
    <div>
      {/* row 1: status tabs (scroll on mobile) + icon-only refresh */}
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
          onClick={() => load()}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* row 2: search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(1);
        }}
        className="relative mb-3"
      >
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, number, email"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none"
        />
      </form>

      {/* row 3: count + per-page */}
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          {total === 0 ? "0" : `${from}\u2013${to}`} of {total}
        </span>
        <label className="flex items-center gap-1.5">
          Per page
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No members.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Profile</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">View</th>
                  {isSuper && <th className="px-4 py-2.5">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-slate-400">
                      {u.member_number ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() =>
                          u.member_number &&
                          router.push(
                            `/members/${slugify(u.full_name)}-${u.member_number}?from=admin`,
                          )
                        }
                        disabled={!u.member_number}
                        className="text-left font-medium text-brand-navy hover:text-brand-blue disabled:hover:text-brand-navy"
                      >
                        {u.full_name}
                      </button>
                      <div className="text-[11px] text-slate-400">
                        {u.whatsapp_number}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] " +
                          (statusStyle[u.status] ||
                            "bg-slate-100 text-slate-600")
                        }
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {u.completion_status || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {isSuper ? (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (
                              confirm(
                                `Change ${u.full_name}'s role to "${newRole}"?`,
                              )
                            ) {
                              act(
                                () => setUserRole(u.member_number, newRole),
                                u.member_number,
                                "Role updated.",
                              );
                            } else {
                              e.target.value = u.role; // revert the select
                            }
                          }}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-500">{u.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() =>
                          u.member_number &&
                          router.push(
                            `/members/${slugify(u.full_name)}-${u.member_number}?from=admin`,
                          )
                        }
                        disabled={!u.member_number}
                        className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] text-brand-blue hover:border-slate-300 disabled:opacity-40"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                    {isSuper && (
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          {u.status !== "suspended" &&
                            u.status !== "deleted" && (
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Suspend ${u.full_name}? They won't be able to log in.`,
                                    )
                                  )
                                    act(
                                      suspendUser,
                                      u.member_number,
                                      "User suspended.",
                                    );
                                }}
                                className="rounded border border-orange-200 px-2 py-1 text-[11px] text-orange-700 hover:bg-orange-50"
                              >
                                Suspend
                              </button>
                            )}
                          {u.status !== "active" && (
                            <button
                              onClick={() => {
                                if (confirm(`Reactivate ${u.full_name}?`))
                                  act(
                                    activateUser,
                                    u.member_number,
                                    "User reactivated.",
                                  );
                              }}
                              className="rounded border border-green-200 px-2 py-1 text-[11px] text-green-700 hover:bg-green-50"
                            >
                              Activate
                            </button>
                          )}
                          {u.status !== "deleted" && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${u.full_name}?`))
                                  act(
                                    deleteUser,
                                    u.member_number,
                                    "User deleted.",
                                  );
                              }}
                              className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination: prev/next at the bottom, after the rows */}
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={goPrev}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              onClick={goNext}
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
