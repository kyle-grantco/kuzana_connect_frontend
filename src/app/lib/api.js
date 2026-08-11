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

// Inject CSRF token from the auth store on every authenticated request
authRequest.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().csrfToken;
    if (token) config.headers["X-CSRF-TOKEN"] = token;
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Single-flight refresh -----------------------------------------------------
// When the access token expires, several requests usually 401 at once. If each
// one refreshed independently we'd fire concurrent /auth/refresh calls; because
// refresh tokens ROTATE (each refresh invalidates the previous), all but the
// first would fail and wrongly log the user out. So we share ONE refresh promise
// across all concurrent 401s: the first starts it, the rest await the same one,
// then everyone retries with the new token.
let refreshPromise = null;

function runRefresh() {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null; // reset once settled so future expiries can refresh
    });
  }
  return refreshPromise;
}

// On 401 — attempt one (shared) refresh, retry the original request, else fail
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

export const refreshSession = async () => {
  try {
    const res = await publicRequest.get("/auth/refresh");
    const newToken = res.data?.csrf_token;
    if (newToken) useAuthStore.getState().setCsrfToken(newToken);
    return true;
  } catch {
    return false;
  }
};

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

// Guard against multiple redirects if several requests fail at once.
let authFailureHandled = false;

const handleAuthFailure = () => {
  if (authFailureHandled) return;
  authFailureHandled = true;
  useNotificationStore
    .getState()
    .notify("Session expired. Please sign in again.", "warning", 0);
  if (typeof window !== "undefined") {
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 1200);
  }
};
