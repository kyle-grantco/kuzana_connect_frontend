// Communication preferences (email opt-out) + public unsubscribe.
import { authRequest, publicRequest } from "./api";

export async function getCommsPrefs() {
  const res = await authRequest.get("/comms/prefs");
  return res.data; // { email_opt_out }
}

export async function setCommsPrefs(email_opt_out) {
  const res = await authRequest.post("/comms/prefs", { email_opt_out });
  return res.data;
}

// Public unsubscribe from an email link. No auth — the signed token identifies
// the user. Calls the backend (this avoids the email linking straight to the
// API cross-origin).
export async function unsubscribeByToken(token) {
  const res = await publicRequest.get(
    `/comms/unsubscribe?token=${encodeURIComponent(token)}`,
  );
  return res.data;
}
