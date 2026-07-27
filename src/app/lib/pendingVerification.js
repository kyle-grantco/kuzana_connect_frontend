// Persists which number is being verified and which flow the user is in, so
// /auth/verify survives the user leaving to WhatsApp and coming back, and
// survives a page refresh. sessionStorage clears when the tab closes.

const KEY = "kc_pending_verification";

// data shape: { whatsapp_number: string, flow: "register" | "login" }
export function setPending(data) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getPending() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPending() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
