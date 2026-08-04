"use client";
import { create } from "zustand";

// Persists directory search state across navigation (e.g. opening a member
// profile and coming back) so the user doesn't lose their query, filters, or
// results — including a deep/AI search that would otherwise have to be re-run.
//
// hasSearched: whether the user has actually run a search this session. On the
// directory's first mount it's false, so the directory does its default load;
// on return from a profile it's true, so the directory restores from here
// instead of re-fetching.
const useSearchStore = create((set) => ({
  hasSearched: false,
  q: "",
  direction: "offering",
  selIndustries: [],
  location: "",
  deep: false,
  results: [],
  aiUsed: false,
  aiEnabled: false,

  // save the full snapshot after any search
  save: (snapshot) => set({ ...snapshot, hasSearched: true }),

  // clear back to defaults (explicit clear)
  reset: () =>
    set({
      hasSearched: false,
      q: "",
      selIndustries: [],
      location: "",
      deep: false,
      results: [],
      aiUsed: false,
    }),
}));

export { useSearchStore };
