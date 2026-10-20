"use client";
import { create } from "zustand";

// Profile completion status, loaded once by the (app) guard layout and read by
// pages to decide whether to lock (incomplete = not yet MVP/searchable).
// hasTraction drives the "add your traction" nudge banner in the app shell.
const useProfileStatus = create((set) => ({
  loaded: false,
  isSearchable: false, // true once completion_status >= 'mvp'
  completionStatus: "pending", // 'pending' | 'mvp' | 'done'
  memberNumber: null,
  fullName: "",
  hasTraction: true, // assume true until known, so the banner doesn't flash
  vouchCount: null, // null = unknown, so the vouch banner doesn't flash
  vouchBack: null, // inviter not yet vouched for: {user_id, full_name, member_number}
  invitedRecently: false, // sent a live invite in the last 7 days (snoozes get-vouched)
  setStatus: (s) => set({ ...s, loaded: true }),
  reset: () =>
    set({
      loaded: false,
      isSearchable: false,
      completionStatus: "pending",
      memberNumber: null,
      fullName: "",
      hasTraction: true,
      vouchCount: null,
      vouchBack: null,
      invitedRecently: false,
    }),
}));

export { useProfileStatus };
