// Proactive suggestions (the two directional sections on the directory page).
import { authRequest } from "./api";

// GET /suggestions -> { can_help, needs_me, has_offers, has_needs }
//   can_help : members who can help with what you need (needs direction)
//   needs_me : members who need what you offer (offers direction)
// Each card: { user_id, member_number, full_name, title, business_name,
//   location, offerings, photo_url, reasons: [{direction, query, w}] }
export async function getSuggestions({ limit } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  const res = await authRequest.get(`/suggestions${qs ? `?${qs}` : ""}`);
  return res.data;
}

// Admin only: view any member's suggestions (debugging match quality).
// GET /suggestions/admin/user/{userId}. Same shape as getSuggestions.
export async function getMemberSuggestionsAdmin(userId, { limit } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);
  const qs = params.toString();
  const res = await authRequest.get(
    `/suggestions/admin/user/${userId}${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}
