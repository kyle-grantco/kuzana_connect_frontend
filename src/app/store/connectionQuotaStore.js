"use client";
import { create } from "zustand";

// A tiny signal so the nav quota indicator can refetch when a request is sent
// (or accepted/declined changes the count), without prop-drilling across trees.
// Bump `version` after any action that changes remaining requests; the quota
// component watches it and refetches.
const useConnectionQuota = create((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export { useConnectionQuota };
