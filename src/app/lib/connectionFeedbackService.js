// In-app connection feedback (authed). Replaces the old tokenized email flow.
import { authRequest } from "./api";

// The next connection the member should be asked about (or { pending:false }).
// Read-only (no server-side stamp), so it's safe to re-check on navigation.
export async function getNextFeedback() {
  const res = await authRequest.get("/connection-feedback/next");
  return res.data; // { pending, person: { user_id, member_number, full_name, title, photo_url } | null }
}

// engaged=false -> recorded, re-asked later (score ignored).
// engaged=true  -> score (1-5) required; note optional.
export async function submitConnectionFeedback({
  other_user_id,
  engaged,
  score,
  note,
}) {
  const res = await authRequest.post("/connection-feedback", {
    other_user_id,
    engaged,
    score: score ?? null,
    note: note ?? null,
  });
  return res.data; // { ok, has_next, next: person | null }
}

// Dismiss the prompt for this connection (re-asked after a window; 2nd = permanent).
export async function dismissConnectionFeedback(other_user_id) {
  const res = await authRequest.post("/connection-feedback/dismiss", {
    other_user_id,
  });
  return res.data; // { ok }
}
