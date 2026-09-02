"use client";
import { create } from "zustand";

// Read the readable CSRF cookie (set non-httpOnly on login/refresh precisely so
// JS can pick it up). Hydrating from it means the FIRST authed request after a
// page load already carries the right X-CSRF-TOKEN header — no 401 -> refresh
// -> retry churn on every fresh load (which was multiplying requests and
// tripping the rate limit).
function readCsrfCookie() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const useAuthStore = create((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  csrfToken: readCsrfCookie(), // hydrate from cookie instead of starting null
  setCsrfToken: (token) => set({ csrfToken: token }),
  memberNumber: null,
  setMemberNumber: (n) => set({ memberNumber: n }),
  clearAuth: () => set({ role: null, csrfToken: null, memberNumber: null }),
}));

export { useAuthStore };
