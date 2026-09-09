// Communication preferences (email opt-out).
import { authRequest } from "./api";

export async function getCommsPrefs() {
  const res = await authRequest.get("/comms/prefs");
  return res.data; // { email_opt_out }
}

export async function setCommsPrefs(email_opt_out) {
  const res = await authRequest.post("/comms/prefs", { email_opt_out });
  return res.data;
}
