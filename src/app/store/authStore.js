"use client";
import { create } from "zustand";

const useAuthStore = create((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  csrfToken: null,
  setCsrfToken: (token) => set({ csrfToken: token }),
  memberNumber: null,
  setMemberNumber: (n) => set({ memberNumber: n }),
  clearAuth: () => set({ role: null, csrfToken: null, memberNumber: null }),
}));

export { useAuthStore };
