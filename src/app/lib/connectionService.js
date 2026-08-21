// Connection API calls (authenticated).
import { authRequest } from "./api";

// POST /connections/{userId} -> connect to a member. Persistent + one-directional
// + once-per-pair. Returns { connected, already_connected, contacts }, where
// contacts = { whatsapp_number, email, linkedin } honoring the member's prefs.
export async function connectTo(userId) {
  const res = await authRequest.post(`/connections/${userId}`);
  return res.data;
}
