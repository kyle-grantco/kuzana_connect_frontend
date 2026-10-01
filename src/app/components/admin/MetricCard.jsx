"use client";

// A fixed metric card with its own period dropdown. The card never disappears;
// only its number changes when the period is picked. Fetches its own count from
// /admin/metrics/count for the selected range.
//
// Props:
//   label   -> card title (e.g. "New members", "Active users")
//   metric  -> "new_members" | "active"
//   options -> which period presets this card offers, e.g. ["today","yesterday"]
//   initial -> the preset key to show on mount
//   allowCustom -> show a Custom option with from/to inputs
//   seed    -> optional { [presetKey]: number } to render the first value without
//              a fetch (lets the dashboard pass already-loaded figures).

import { useEffect, useMemo, useRef, useState } from "react";
import { getMetricCount } from "@/app/lib/adminService";

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function presetRange(key) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = (ref) => {
    const d = new Date(ref);
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
    return d;
  };

  switch (key) {
    case "today":
      return { from: iso(today), to: iso(today), label: "Today" };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: iso(y), to: iso(y), label: "Yesterday" };
    }
    case "this_week":
      return {
        from: iso(startOfWeek(today)),
        to: iso(today),
        label: "This week",
      };
    case "last_week": {
      const ws = startOfWeek(today);
      const lws = new Date(ws);
      lws.setDate(lws.getDate() - 7);
      const lwe = new Date(ws);
      lwe.setDate(lwe.getDate() - 1);
      return { from: iso(lws), to: iso(lwe), label: "Last week" };
    }
    case "this_month": {
      const ms = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: iso(ms), to: iso(today), label: "This month" };
    }
    default: {
      // month_N : N calendar months back (full month)
      const match = /^month_(\d+)$/.exec(key);
      if (match) {
        const i = Number(match[1]);
        const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        return {
          from: iso(ms),
          to: iso(me),
          label: ms.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          }),
        };
      }
      return { from: iso(today), to: iso(today), label: "Today" };
    }
  }
}

function buildOptions(options, monthsBack) {
  const list = options.map((k) => ({ key: k, label: presetRange(k).label }));
  if (monthsBack) {
    for (let i = 1; i <= monthsBack; i++) {
      const r = presetRange(`month_${i}`);
      list.push({ key: `month_${i}`, label: r.label });
    }
  }
  return list;
}

export default function MetricCard({
  label,
  metric,
  options = ["today"],
  initial,
  monthsBack = 0,
  allowCustom = false,
  seed,
  suffix = "",
}) {
  const opts = useMemo(
    () => buildOptions(options, monthsBack),
    [options, monthsBack],
  );
  const [key, setKey] = useState(initial || options[0]);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [value, setValue] = useState(
    seed && (initial || options[0]) in seed
      ? seed[initial || options[0]]
      : null,
  );
  const [loading, setLoading] = useState(false);
  const seededKey = useRef(initial || options[0]);

  async function fetchFor(range) {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    try {
      const r = await getMetricCount({
        metric,
        from: range.from,
        to: range.to,
      });
      setValue(r.count);
    } catch {
      setValue(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // don't refetch the seeded initial value on mount
    if (key === seededKey.current && seed && key in seed) return;
    if (key === "custom") return; // wait for Apply
    fetchFor(presetRange(key));
    // eslint-disable-line
  }, [key]); // eslint-disable-line

  const showCustomInputs = allowCustom && key === "custom";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold text-brand-navy">
        {loading ? "…" : value == null ? "—" : value}
        {suffix}
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
      <div className="mt-2">
        <select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 focus:border-brand-blue focus:outline-none"
        >
          {opts.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
          {allowCustom && <option value="custom">Custom…</option>}
        </select>
        {showCustomInputs && (
          <div className="mt-1.5 flex items-center gap-1">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] focus:border-brand-blue focus:outline-none"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] focus:border-brand-blue focus:outline-none"
            />
            <button
              onClick={() =>
                customFrom &&
                customTo &&
                fetchFor({ from: customFrom, to: customTo })
              }
              disabled={!customFrom || !customTo}
              className="shrink-0 rounded-md bg-brand-blue px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
            >
              Go
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
