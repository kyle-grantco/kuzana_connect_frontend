"use client";

// Combined new-members + discoverable card for one period, with the activation
// rate. Replaces two side-by-side cards (New members / Discoverable) with one,
// since they're the same cohort read two ways. Shows "new / discoverable" and a
// subtle % (discoverable ÷ new = activation). One period dropdown drives both.

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
      list.push({ key: `month_${i}`, label: presetRange(`month_${i}`).label });
    }
  }
  return list;
}

export default function ActivationCard({
  options = ["today", "yesterday"],
  initial,
  monthsBack = 0,
  allowCustom = false,
  seedNew, // optional { [presetKey]: number }
  seedDiscoverable,
}) {
  const optionsKey = options.join("|");
  const opts = useMemo(
    () => buildOptions(options, monthsBack),
    [optionsKey, monthsBack], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [key, setKey] = useState(initial || options[0]);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const firstKey = initial || options[0];
  const seeded =
    seedNew &&
    firstKey in seedNew &&
    seedDiscoverable &&
    firstKey in seedDiscoverable;
  const [vals, setVals] = useState(
    seeded ? { n: seedNew[firstKey], d: seedDiscoverable[firstKey] } : null,
  );
  const [loading, setLoading] = useState(false);
  const usedSeed = useRef(!!seeded);

  async function fetchFor(range) {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    try {
      const [n, d] = await Promise.all([
        getMetricCount({
          metric: "new_members",
          from: range.from,
          to: range.to,
        }),
        getMetricCount({
          metric: "discoverable",
          from: range.from,
          to: range.to,
        }),
      ]);
      setVals({ n: n.count, d: d.count });
    } catch {
      setVals(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (usedSeed.current) {
      usedSeed.current = false;
      return;
    }
    if (key === "custom") return;
    fetchFor(presetRange(key));
  }, [key]); // eslint-disable-line

  const showCustom = allowCustom && key === "custom";
  const pct = vals && vals.n > 0 ? Math.round((vals.d / vals.n) * 100) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold text-brand-navy">
        {loading || !vals ? (
          "…"
        ) : (
          <>
            {vals.n}
            <span className="text-slate-300"> | </span>
            {vals.d}
            {pct != null && (
              <span className="ml-1.5 text-sm font-medium text-slate-400">
                ({pct}%)
              </span>
            )}
          </>
        )}
      </div>
      <div className="mt-0.5 text-xs text-slate-500">New | Discoverable</div>
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
        {showCustom && (
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
