"use client";

// Shared vouch form: relationship (dropdown), remarks (one line), and the
// engagement period (from / to as month+year, side by side, "to" defaults to
// Present via a Current checkbox). Used by both the endorsement form and the
// invite form (invite adds a name field on top via `extraTop`).
//
// Props:
//   initial     - existing row to edit ({relationship_type, remarks, engaged_from, engaged_to}) or null
//   saving      - disables inputs + shows busy label
//   error       - string shown under the form
//   submitLabel - confirm button text
//   onSubmit(values) - { relationship_type, remarks, engaged_from, engaged_to }
//   onCancel    - close without saving
//   extraTop    - optional node rendered above the relationship field (invite name)

import { useState } from "react";
import {
  RELATIONSHIP_OPTIONS,
  LIMITS,
  yearList,
  yearOf,
  joinYear,
} from "@/app/lib/vouch";

export default function VouchForm({
  initial,
  saving = false,
  error = "",
  submitLabel = "Save",
  onSubmit,
  onCancel,
  extraTop = null,
}) {
  const years = yearList();

  const [relationship, setRelationship] = useState(
    initial?.relationship_type || "",
  );
  const [remarks, setRemarks] = useState(initial?.remarks || "");

  const [fromYear, setFromYear] = useState(yearOf(initial?.engaged_from));
  const [toYear, setToYear] = useState(yearOf(initial?.engaged_to));
  // "current" when editing an existing row that had from but no to, or by default
  const [isCurrent, setIsCurrent] = useState(
    initial ? !!initial.engaged_from && !initial.engaged_to : true,
  );

  const [localError, setLocalError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (!relationship) {
      setLocalError("Choose how you know this person.");
      return;
    }
    if (!remarks.trim() || remarks.trim().length < 2) {
      setLocalError("Add a short note on why you vouch for them.");
      return;
    }
    const engaged_from = joinYear(fromYear);
    if (!engaged_from) {
      setLocalError("Select the year you started working together.");
      return;
    }
    let engaged_to = null;
    if (!isCurrent) {
      engaged_to = joinYear(toYear);
      if (!engaged_to) {
        setLocalError("Select the year you stopped, or mark it as current.");
        return;
      }
      // same year is fine; the end year just can't be before the start year
      if (engaged_to < engaged_from) {
        setLocalError("The end year can't be before the start year.");
        return;
      }
    }

    onSubmit({
      relationship_type: relationship,
      remarks: remarks.trim(),
      engaged_from,
      engaged_to,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {extraTop}

      <div>
        <label className="mb-1 block text-xs text-slate-500">
          How do you know them?
        </label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          disabled={saving}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        >
          <option value="" disabled>
            Select relationship
          </option>
          {RELATIONSHIP_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-slate-500">
            Why do you vouch for them?
          </label>
          <span className="text-[10px] text-slate-400">
            {remarks.length}/{LIMITS.remarks}
          </span>
        </div>
        <input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={saving}
          maxLength={LIMITS.remarks}
          placeholder="What they are genuinely good at, in your own words"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
      </div>

      {/* engagement period: from / to side by side */}
      <div>
        <label className="mb-1 block text-xs text-slate-500">
          Which years did you work together?
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            From
          </span>
          <YearSelect
            value={fromYear}
            onChange={setFromYear}
            years={years}
            disabled={saving}
          />
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            To
          </span>
          {isCurrent ? (
            <div className="flex h-[42px] items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
              Present
            </div>
          ) : (
            <YearSelect
              value={toYear}
              onChange={setToYear}
              years={years}
              disabled={saving}
            />
          )}
        </div>
        <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            disabled={saving}
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
          />
          We currently work together
        </label>
      </div>

      {(localError || error) && (
        <p className="text-xs text-brand-red">{localError || error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function YearSelect({ value, onChange, years, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
    >
      <option value="" disabled>
        Year
      </option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
