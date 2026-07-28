"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Selectable industry chips. All industries are passed in (loaded once); this
// only controls how many are *shown* — the first `initial` (the common Kuzana
// sectors, which come first from the API) are visible, the rest reveal on
// "Show more". Any selected-but-hidden chip is always shown so selections stay
// visible when collapsed.
export default function IndustryChips({
  industries = [],
  selected = [],
  onToggle,
  initial = 8,
  size = "sm", // "sm" | "xs"
}) {
  const [expanded, setExpanded] = useState(false);

  const pad = size === "xs" ? "px-3 py-1 text-xs" : "px-3 py-1.5 text-xs";

  // visible = first `initial`, plus any selected ones beyond that (so a chosen
  // hidden chip doesn't disappear when collapsed)
  const visible = expanded
    ? industries
    : industries.filter((ind, i) => i < initial || selected.includes(ind.id));

  const hiddenCount = industries.length - visible.length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visible.map((ind) => {
          const on = selected.includes(ind.id);
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => onToggle(ind.id)}
              className={
                "rounded-full border transition-colors " +
                pad +
                " " +
                (on
                  ? "border-brand-yellow bg-brand-yellow-100 text-brand-navy font-medium"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300")
              }
            >
              {ind.label}
            </button>
          );
        })}
      </div>

      {industries.length > initial && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand-blue hover:text-brand-blue-600"
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={12} />
            </>
          ) : (
            <>
              Show more{hiddenCount > 0 ? ` (${hiddenCount})` : ""}{" "}
              <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
