"use client";

// Shared vouch form: relationship (dropdown + Other free-text), remarks, year.
// Used by both the endorsement form and the invite form (invite adds a name
// field above it, passed via `extraTop`).
//
// Props:
//   initial     - existing row to edit ({relationship_type, remarks, year_of_engagement}) or null
//   saving      - disables inputs + shows busy label
//   error       - string shown under the form
//   submitLabel - confirm button text
//   onSubmit(values) - values = { relationship_type, remarks, year_of_engagement }
//   onCancel    - close without saving
//   extraTop    - optional node rendered above the relationship field (invite name)

import { useState } from "react";
import { RELATIONSHIP_OPTIONS, LIMITS } from "@/app/lib/vouch";

export default function VouchForm({
  initial,
  saving = false,
  error = "",
  submitLabel = "Save",
  onSubmit,
  onCancel,
  extraTop = null,
}) {
  // If editing and the stored relationship isn't in the canonical list, treat
  // it as an "Other" custom value so it round-trips cleanly.
  const initRel = initial?.relationship_type || "";
  const initIsOther = initRel && !RELATIONSHIP_OPTIONS.includes(initRel);

  const [relSelect, setRelSelect] = useState(
    initRel ? (initIsOther ? "Other" : initRel) : "",
  );
  const [relOther, setRelOther] = useState(initIsOther ? initRel : "");
  const [remarks, setRemarks] = useState(initial?.remarks || "");
  const [year, setYear] = useState(initial?.year_of_engagement || "");
  const [localError, setLocalError] = useState("");

  const isOther = relSelect === "Other";
  const effectiveRel = isOther ? relOther.trim() : relSelect;

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    if (!effectiveRel || effectiveRel.length < 2) {
      setLocalError("Choose or enter how you know this person.");
      return;
    }
    if (!remarks.trim() || remarks.trim().length < 2) {
      setLocalError("Add a short note on why you vouch for them.");
      return;
    }
    onSubmit({
      relationship_type: effectiveRel,
      remarks: remarks.trim(),
      year_of_engagement: year || null,
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
          value={relSelect}
          onChange={(e) => setRelSelect(e.target.value)}
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
        {isOther && (
          <input
            value={relOther}
            onChange={(e) => setRelOther(e.target.value)}
            disabled={saving}
            maxLength={LIMITS.relationship}
            placeholder="How you know them"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
          />
        )}
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
          placeholder="One line, e.g. delivers reliably and is honest to work with"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500">
          When did you work together?{" "}
          <span className="text-slate-400">(optional)</span>
        </label>
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={saving}
          maxLength={20}
          placeholder="e.g. 2025, or currently"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
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
