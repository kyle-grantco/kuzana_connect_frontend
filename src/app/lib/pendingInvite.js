// Persists the invite token across the /invite/{token} -> /auth/register hop.
//
// The token also travels in the register URL (?invite=...), which is the source
// of truth and survives refresh, new tabs and bookmarks. This sessionStorage
// mirror is a fallback so the register page can tell "arrived with no invite at
// all" (show the blocked, invite-only state) apart from "lost the query param",
// and so the token survives an in-app client navigation that drops the query.
//
// Dropped once registration succeeds — from that point the backend carries the
// token on the pending user row and consumes it at verify.

const KEY = "kc_pending_invite";

export function setPendingInvite(token) {
  if (typeof window === "undefined" || !token) return;
  try {
    sessionStorage.setItem(KEY, token);
  } catch {}
}

export function getPendingInvite() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
