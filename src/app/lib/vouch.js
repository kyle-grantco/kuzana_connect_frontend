// Shared vocabulary + helpers for the vouch fields used by both invites and
// endorsements.
//
// RELATIONSHIP_OPTIONS is the canonical dropdown. "General business connection"
// is the default catch-all (first). The backend only length-validates the
// value, so the set can evolve without a migration.

export const RELATIONSHIP_OPTIONS = [
  "General business connection",
  "Business partner",
  "Colleague",
  "Client",
  "Service provider",
  "Employer",
  "Employee",
  "Investor",
  "Investee",
];

export const LIMITS = {
  relationship: 40,
  remarks: 140,
  name: 120,
};

// ── Engagement dates (month + year) ──────────────────────────────────────────
// Stored as "YYYY-MM" strings. engaged_to null/"" = current/ongoing.

export const MONTHS = [
  { v: "01", label: "Jan" },
  { v: "02", label: "Feb" },
  { v: "03", label: "Mar" },
  { v: "04", label: "Apr" },
  { v: "05", label: "May" },
  { v: "06", label: "Jun" },
  { v: "07", label: "Jul" },
  { v: "08", label: "Aug" },
  { v: "09", label: "Sep" },
  { v: "10", label: "Oct" },
  { v: "11", label: "Nov" },
  { v: "12", label: "Dec" },
];

// Years, newest first, back ~40 years.
export function yearList() {
  const now = new Date().getFullYear();
  const years = [];
  for (let y = now; y >= now - 40; y--) years.push(String(y));
  return years;
}

// Engagement dates are stored as a plain year "YYYY". Older rows may still hold
// "YYYY-MM"; all readers below accept either and render just the year.

// Extract the year from "YYYY" or legacy "YYYY-MM". "" if none.
export function yearOf(v) {
  if (!v) return "";
  const m = String(v).match(/^(\d{4})/);
  return m ? m[1] : "";
}

// The value we now store: just the year string (or "").
export function joinYear(year) {
  return year ? String(year) : "";
}

// Human label for an engagement value: just the year, e.g. "2025".
export function monthLabel(v) {
  return yearOf(v);
}

// Build the engagement period text from from/to (year-based).
//   different years -> "2019 – 2022"
//   same year       -> "2024"        (collapsed, no redundant range)
//   from, no to     -> "2021 – Present"
//   neither         -> "" (old rows with no dates)
export function engagementPeriod(from, to) {
  const f = yearOf(from);
  if (!f) return "";
  if (!to) return `${f} – Present`;
  const t = yearOf(to);
  if (!t) return `${f} – Present`;
  return f === t ? f : `${f} – ${t}`;
}
