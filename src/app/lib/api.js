import axios from "axios";
import { useNotificationStore } from "@/app/store/notificationStore";
import { useAuthStore } from "@/app/store/authStore";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// authRequest — for authenticated calls (injects CSRF, auto-refreshes on 401)
export const authRequest = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// publicRequest — for pre-auth calls (register, send-otp, verify-otp, refresh)
export const publicRequest = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Read the readable CSRF cookie as a fallback, so a request never goes out with
// an empty CSRF header just because the in-memory store hasn't hydrated yet
// (that empty header 401s -> refresh -> retry, multiplying requests).
function csrfFromCookie() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Best-effort clear of the readable CSRF cookie. On a hard auth failure the
// access cookie is expired/invalid but its readable CSRF twin may linger; if we
// don't clear it, the store re-hydrates a dead token and the NEXT request goes
// out with stale CSRF and fails — which is why an action (like requesting an
// OTP) would fail once and only work on the second try. Clearing it here makes
// the first post-logout request clean.
function clearCsrfCookie() {
  if (typeof document === "undefined") return;
  // expire it on the common paths it may have been set on
  const expire = "csrf_access_token=; Max-Age=0; path=/;";
  document.cookie = expire;
}

// Inject CSRF token (store first, cookie fallback) on every authenticated request
authRequest.interceptors.request.use(
  (config) => {
    let token = useAuthStore.getState().csrfToken;
    if (!token) {
      token = csrfFromCookie();
      if (token) useAuthStore.getState().setCsrfToken(token);
    }
    if (token) config.headers["X-CSRF-TOKEN"] = token;
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Single-flight refresh -----------------------------------------------------
// When the access token expires, several requests usually 401 at once. Refresh
// tokens ROTATE server-side: each successful /auth/refresh revokes the token it
// was called with. The browser swaps in the new refresh cookie from the
// response, so refreshes that run one-AFTER-another are fine — each carries the
// current token. The fatal case is refreshes that OVERLAP in flight: both were
// sent carrying the same pre-rotation cookie, the backend rotates on the first,
// and the second is a replay of a revoked token -> 401 -> forced logout.
//
// So we share ONE refresh promise across all concurrent 401s: the first starts
// it, the rest await the same one, then everyone retries with the new token.
// Nothing may refresh outside this guard (see refreshSessionShared below).
let refreshPromise = null;

function runRefresh() {
  if (!refreshPromise) {
    const p = refreshSession();
    refreshPromise = p;
    // Clear the guard on a MACROtask, not inside .finally(). A .finally()
    // callback runs as a microtask the instant the refresh settles — i.e.
    // BEFORE the `await runRefresh()` in the interceptor resumes. That left a
    // window in which a 401 arriving moments later saw refreshPromise === null
    // and started a SECOND /auth/refresh. Deferring the reset lets every caller
    // already waiting on this refresh resume off the SAME promise first, so one
    // token expiry produces exactly one rotation.
    p.finally(() => {
      setTimeout(() => {
        if (refreshPromise === p) refreshPromise = null;
      }, 0);
    });
  }
  return refreshPromise;
}

// On 401 — attempt one (shared) refresh, retry the original request, else fail.
// A CSRF-mismatch 401 that is NOT token expiry would loop, so we only refresh
// once per request (_retry guard) and give up cleanly after.
authRequest.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const success = await runRefresh();
      if (success) {
        originalRequest.headers["X-CSRF-TOKEN"] =
          useAuthStore.getState().csrfToken;
        return authRequest(originalRequest);
      }
      handleAuthFailure();
    }
    return Promise.reject(error);
  },
);

// PRIVATE — deliberately not exported. This is the RAW refresh: it bypasses the
// single-flight guard, so two callers can have refreshes in flight at once. Both
// then present the same pre-rotation refresh cookie, the backend rotates on the
// first, and the second 401s -> the user is logged out at random. That is
// exactly the bug the (app) layout used to cause by importing it directly.
// Everything outside this module must go through refreshSessionShared().
const refreshSession = async () => {
  try {
    const res = await publicRequest.get("/auth/refresh");
    const newToken = res.data?.csrf_token;
    if (newToken) useAuthStore.getState().setCsrfToken(newToken);
    return true;
  } catch {
    return false;
  }
};

// The ONLY safe way to refresh from outside this module: shares the in-flight
// refresh with any concurrent caller instead of starting a competing one.
// Returns true on success, false if the session is genuinely dead.
export const refreshSessionShared = () => runRefresh();

export const checkAuthStatus = async () => {
  const { setRole } = useAuthStore.getState();
  try {
    const res = await authRequest.get("/auth/auth_check");
    setRole(res.data?.role);
    return true;
  } catch {
    return false;
  }
};

// Guard against multiple redirects if several requests fail at once. This is a
// TIMESTAMP, not a permanent boolean: a latched boolean never reset if the
// redirect below didn't actually complete (user navigated away first, or a soft
// nav kept the module alive), and every later genuine expiry then failed
// silently — no toast, no redirect, just dead requests. A short window is all
// that's needed to collapse a burst of simultaneous failures into one redirect.
const AUTH_FAILURE_WINDOW_MS = 5000;
let authFailureAt = 0;

const handleAuthFailure = () => {
  const now = Date.now();
  if (now - authFailureAt < AUTH_FAILURE_WINDOW_MS) return;
  authFailureAt = now;

  // Clean up stale auth state so the login page starts fresh. Without this, the
  // dead CSRF cookie lingers and re-hydrates into the store, so the first action
  // on the login page (e.g. requesting an OTP) goes out with stale state and
  // fails — only working on a second try. Clearing store + cookie fixes that.
  try {
    useAuthStore.getState().clearAuth();
    clearCsrfCookie();
  } catch {
    /* ignore */
  }

  useNotificationStore
    .getState()
    .notify("Session expired. Please sign in again.", "warning", 0);
  if (typeof window !== "undefined") {
    setTimeout(() => {
      // Full navigation to login resets module state so future sessions behave
      // normally. If this navigation never happens, the timestamp guard above
      // expires on its own rather than latching forever.
      window.location.href = "/auth/login";
    }, 1200);
  }
};
