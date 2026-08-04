"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Building2, X, SlidersHorizontal } from "lucide-react";
import { searchMembers, getIndustries } from "@/app/lib/profileService";
import { slugify } from "@/app/lib/slug";
import { useProfileStatus } from "@/app/store/profileStatusStore";
import LockedTeaser from "@/app/components/app/LockedTeaser";
import IndustryChips from "@/app/components/ui/IndustryChips";

export default function DirectoryPage() {
  const router = useRouter();
  const isSearchable = useProfileStatus((s) => s.isSearchable);
  const locked = !isSearchable;
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState("offering"); // offering = I'm looking for; looking_for = find who needs what I offer
  const [industries, setIndustries] = useState([]);
  const [selIndustries, setSelIndustries] = useState([]);
  const [location, setLocation] = useState("");
  const [openPanel, setOpenPanel] = useState(null); // "industry" | "location" | null
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    getIndustries()
      .then(setIndustries)
      .catch(() => {});
  }, []);

  const run = useCallback(
    async (deep = false) => {
      if (deep) setDeepLoading(true);
      else setLoading(true);
      try {
        const data = await searchMembers({
          q: q.trim(),
          direction,
          industry: selIndustries,
          location: location.trim(),
          deep,
        });
        setResults(data.results || []);
        setAiUsed(!!data.ai_used);
        setAiEnabled(!!data.ai_enabled);
      } catch {
        setResults([]);
        setAiUsed(false);
      } finally {
        if (deep) setDeepLoading(false);
        else setLoading(false);
      }
    },
    [q, direction, selIndustries, location],
  );

  useEffect(() => {
    if (!locked) run();
  }, [direction, selIndustries, location, locked]); // eslint-disable-line

  // close panel on outside click
  useEffect(() => {
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target))
        setOpenPanel(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    run();
  }
  function toggleIndustry(id) {
    setSelIndustries((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  function clearFilters() {
    setSelIndustries([]);
    setLocation("");
    setOpenPanel(null);
  }
  function openMember(m) {
    router.push(`/members/${slugify(m.full_name)}-${m.member_number}`);
  }

  const industryLabel =
    selIndustries.length === 0
      ? "Industry"
      : selIndustries.length === 1
        ? industries.find((i) => i.id === selIndustries[0])?.label || "Industry"
        : `${selIndustries.length} industries`;

  const hasFilters = selIndustries.length > 0 || location.trim();

  return (
    <div className="relative">
      {locked && <LockedTeaser variant="overlay" />}
      <div
        className={locked ? "pointer-events-none select-none opacity-60" : ""}
      >
        {/* responsive one-line hint (heading dropped) */}
        <p className="mb-4 text-sm text-slate-500">
          Search by what you need or what you offer.
        </p>

        {/* search card */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* direction toggle with clearer labels */}
          <div className="mb-3 flex gap-1 rounded-lg bg-slate-50 p-1 text-xs sm:text-sm">
            <button
              onClick={() => setDirection("offering")}
              className={
                "flex-1 rounded-md px-2 py-1.5 " +
                (direction === "offering"
                  ? "bg-brand-blue text-white font-medium"
                  : "text-slate-500")
              }
            >
              Find what I need
            </button>
            <button
              onClick={() => setDirection("looking_for")}
              className={
                "flex-1 rounded-md px-2 py-1.5 " +
                (direction === "looking_for"
                  ? "bg-brand-blue text-white font-medium"
                  : "text-slate-500")
              }
            >
              Find who needs me
            </button>
          </div>

          {/* search input */}
          <form
            onSubmit={onSubmit}
            className="mb-3 flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/15"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  direction === "offering"
                    ? "What are you looking for? e.g. HR services, soya suppliers"
                    : "What do you offer? e.g. HR services, legal advice"
                }
                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 bg-brand-blue px-5 text-sm font-medium text-white hover:bg-brand-blue-600"
            >
              Search
            </button>
          </form>

          {/* collapsed filter buttons */}
          <div
            className="relative flex flex-wrap items-center gap-2"
            ref={panelRef}
          >
            {/* industry */}
            <button
              onClick={() =>
                setOpenPanel(openPanel === "industry" ? null : "industry")
              }
              className={
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs " +
                (selIndustries.length
                  ? "border-brand-yellow bg-brand-yellow-100 text-brand-navy font-medium"
                  : "border-slate-200 text-slate-500 hover:border-slate-300")
              }
            >
              <Building2 size={13} /> {industryLabel}
            </button>

            {/* location */}
            <button
              onClick={() =>
                setOpenPanel(openPanel === "location" ? null : "location")
              }
              className={
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs " +
                (location.trim()
                  ? "border-brand-yellow bg-brand-yellow-100 text-brand-navy font-medium"
                  : "border-slate-200 text-slate-500 hover:border-slate-300")
              }
            >
              <MapPin size={13} /> {location.trim() || "Location"}
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-red"
              >
                <X size={12} /> Clear
              </button>
            )}

            {/* industry panel */}
            {openPanel === "industry" && (
              <div className="absolute top-full left-0 z-20 mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <IndustryChips
                  industries={industries}
                  selected={selIndustries}
                  onToggle={toggleIndustry}
                  size="xs"
                />
              </div>
            )}

            {/* location panel */}
            {openPanel === "location" && (
              <div className="absolute top-full left-0 z-20 mt-2 w-full max-w-xs rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <input
                  autoFocus
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setOpenPanel(null)}
                  placeholder="e.g. Nairobi"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* results */}
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Searching…</p>
        ) : results.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-400">No members found.</p>
            {q.trim() && !aiUsed && aiEnabled && (
              <button
                onClick={() => run(true)}
                disabled={deepLoading}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-brand-blue hover:border-slate-300 disabled:opacity-50"
              >
                <Search size={13} />{" "}
                {deepLoading ? "Searching…" : "Search deeper"}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* results header: count + search-deeper */}
            {q.trim() && (
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {aiUsed
                    ? "Showing related results"
                    : `${results.length} result${results.length === 1 ? "" : "s"}`}
                </p>
                {!aiUsed && aiEnabled && (
                  <button
                    onClick={() => run(true)}
                    disabled={deepLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-brand-blue hover:border-slate-300 disabled:opacity-50"
                  >
                    <Search size={13} />{" "}
                    {deepLoading ? "Searching…" : "Search deeper"}
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((m) => (
                <button
                  key={m.member_number}
                  onClick={() => openMember(m)}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-sm font-medium text-white">
                      {m.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photo_url}
                          alt={m.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(m.full_name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-brand-navy">
                        {m.full_name}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        {[m.title, m.business_name].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  {m.offerings?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.offerings.slice(0, 3).map((o, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-[11px] text-brand-blue-700"
                        >
                          {o}
                        </span>
                      ))}
                      {m.offerings.length > 3 && (
                        <span className="px-1 text-[11px] text-slate-400">
                          +{m.offerings.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {m.location && (
                    <div className="mt-3 text-[11px] text-slate-400">
                      {m.location}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}
