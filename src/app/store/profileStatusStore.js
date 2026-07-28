"use client";
import { create } from "zustand";

// Profile completion status, loaded once by the (app) guard layout and read by
// pages to decide whether to lock (incomplete = not yet MVP/searchable).
const useProfileStatus = create((set) => ({
  loaded: false,
  isSearchable: false, // true once completion_status >= 'mvp'
  completionStatus: "pending", // 'pending' | 'mvp' | 'done'
  memberNumber: null,
  fullName: "",
  setStatus: (s) => set({ ...s, loaded: true }),
  reset: () =>
    set({
      loaded: false,
      isSearchable: false,
      completionStatus: "pending",
      memberNumber: null,
      fullName: "",
    }),
}));

export { useProfileStatus };
