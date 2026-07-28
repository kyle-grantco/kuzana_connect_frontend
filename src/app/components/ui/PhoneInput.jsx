"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  AsYouType,
} from "libphonenumber-js";

// Build the country list once: ISO code, dial code, display name.
const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = getCountries()
  .map((iso) => ({
    iso,
    dial: getCountryCallingCode(iso),
    name: REGION_NAMES.of(iso) || iso,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

function flagEmoji(iso) {
  // regional-indicator letters
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/*
  Controlled phone input.
  Props:
    - country: ISO2 (e.g. "KE"), default "KE"
    - onCountryChange(iso)
    - value: the local number string the user typed
    - onChange(localString, e164OrNull, isValid)
    - label, error, autoFocus

  Emits the E.164 string ("+254712345678") + validity via onChange, so the
  parent can store the normalized number and gate submission on validity.
*/
export default function PhoneInput({
  country = "KE",
  onCountryChange,
  value = "",
  onChange,
  label = "WhatsApp number",
  error,
  autoFocus,
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const boxRef = useRef(null);

  const current =
    COUNTRIES.find((c) => c.iso === country) ||
    COUNTRIES.find((c) => c.iso === "KE");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return COUNTRIES;
    const digits = f.replace(/\D/g, "");
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(f) ||
        c.iso.toLowerCase().includes(f) ||
        (digits.length > 0 && c.dial.includes(digits)),
    );
  }, [filter]);

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setFilter("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function emit(localStr, iso) {
    const parsed = parsePhoneNumberFromString(localStr, iso);
    const e164 = parsed ? parsed.number : null;
    const valid = parsed ? parsed.isValid() : false;
    onChange?.(localStr, e164, valid);
  }

  function handleNumberChange(e) {
    // format as the user types for readability, but keep raw for parsing
    const raw = e.target.value;
    emit(raw, current.iso);
  }

  function pickCountry(iso) {
    setOpen(false);
    setFilter("");
    onCountryChange?.(iso);
    emit(value, iso); // re-validate current number against new country
  }

  // pretty display of what they've typed
  const formatted = value ? new AsYouType(current.iso).input(value) : "";

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          {label}
        </label>
      )}

      <div className="flex gap-2" ref={boxRef}>
        {/* country selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-brand-ink hover:border-slate-300"
          >
            <span>{flagEmoji(current.iso)}</span>
            <span>+{current.dial}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {open && (
            <div className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input
                  autoFocus
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search country or code"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => pickCountry(c.iso)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{flagEmoji(c.iso)}</span>
                    <span className="flex-1 truncate text-slate-700">
                      {c.name}
                    </span>
                    <span className="text-slate-400">+{c.dial}</span>
                    {c.iso === current.iso && (
                      <Check size={14} className="text-brand-blue" />
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">
                    No match
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* number field */}
        <input
          type="tel"
          inputMode="tel"
          autoFocus={autoFocus}
          value={formatted}
          onChange={handleNumberChange}
          placeholder="712 345 678"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
      </div>

      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
