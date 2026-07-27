"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

// Add-one-at-a-time chip input. Stores an array in parent state; each item is a
// short free-text string. Blocks the "|" delimiter and line breaks so the value
// stays safe to pipe-join on the backend.
export default function ChipInput({
  value = [],
  onChange,
  placeholder,
  maxLen = 60,
  maxItems = 10,
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function add() {
    const s = draft.trim();
    if (!s) return;
    if (s.includes("|")) {
      setError("The '|' character isn't allowed.");
      return;
    }
    if (s.length > maxLen) {
      setError(`Keep each under ${maxLen} characters.`);
      return;
    }
    if (value.length >= maxItems) {
      setError(`Up to ${maxItems} items.`);
      return;
    }
    if (value.some((v) => v.toLowerCase() === s.toLowerCase())) {
      setError("Already added.");
      return;
    }
    onChange([...value, s]);
    setDraft("");
    setError("");
  }

  function remove(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.replace(/[|\n\r]/g, ""));
            if (error) setError("");
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={maxLen}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg bg-brand-blue px-3 text-sm font-medium text-white hover:bg-brand-blue-600"
        >
          <Plus size={16} />
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-brand-yellow-100 py-1 pl-3 pr-1.5 text-xs text-brand-navy"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-full p-0.5 text-brand-yellow-700 hover:bg-brand-yellow-600/20"
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
