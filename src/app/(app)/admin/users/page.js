"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, RefreshCw } from "lucide-react";
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

  useEffect(() => {
    getMyProfile()
      .then((me) => setIsSuper(me?.user?.role === "super_admin"))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers({
        status: status === "all" ? undefined : status,
        q: q.trim(),
      });
      setRows(data.results || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    load();
  }, [status]); // eslint-disable-line

  async function act(fn, memberNumber, okMsg) {
    try {
      await fn(memberNumber);
      notify(okMsg, "success", 2500);
      load();
    } catch (e) {
      notify(e.response?.data?.detail || "Action failed.", "error", 3500);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-navy">Members</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {/* status tabs */}
      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-xs">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setStatus(t)}
            className={
              "rounded-md px-3 py-1.5 capitalize " +
              (status === t
                ? "bg-white font-medium text-brand-navy"
                : "text-slate-500")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="relative mb-4 max-w-sm"
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

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No members.</p>
      ) : (
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
                        (statusStyle[u.status] || "bg-slate-100 text-slate-600")
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
                        {u.status !== "suspended" && u.status !== "deleted" && (
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
      )}
    </div>
  );
}
