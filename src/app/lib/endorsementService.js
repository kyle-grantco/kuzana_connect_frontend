// Endorsement API calls (authenticated — use authRequest so CSRF + refresh apply).
import { authRequest } from "./api";

// GET /endorsements/user/{user_id}?direction=received|given -> paginated list.
// Returns { items, total, page, page_size }. Each item: { id, relationship_type,
// remarks, engaged_from, engaged_to, created_at, updated_at, person, can_edit }.
export async function listEndorsements(
  userId,
  { direction = "received", page = 1, page_size = 10 } = {},
) {
  const params = new URLSearchParams();
  params.set("direction", direction);
  params.set("page", page);
  params.set("page_size", page_size);
  const res = await authRequest.get(
    `/endorsements/user/${userId}?${params.toString()}`,
  );
  return res.data;
}

// GET /endorsements/mine/for/{user_id} -> { endorsement | null }.
// Lets the profile decide between "Endorse this person" and showing the
// viewer's existing endorsement with edit/delete.
export async function myEndorsementFor(userId) {
  const res = await authRequest.get(`/endorsements/mine/for/${userId}`);
  return res.data?.endorsement || null;
}

// POST /endorsements -> create. Returns the created endorsement.
export async function createEndorsement({
  endorsed_user_id,
  relationship_type,
  remarks,
  engaged_from,
  engaged_to,
}) {
  const res = await authRequest.post("/endorsements", {
    endorsed_user_id,
    relationship_type,
    remarks,
    engaged_from,
    engaged_to: engaged_to || null,
  });
  return res.data;
}

// PATCH /endorsements/{id} -> edit own. Any subset of fields.
export async function updateEndorsement(endorsementId, patch) {
  const res = await authRequest.patch(`/endorsements/${endorsementId}`, patch);
  return res.data;
}

// DELETE /endorsements/{id} -> hard-delete own.
export async function deleteEndorsement(endorsementId) {
  const res = await authRequest.delete(`/endorsements/${endorsementId}`);
  return res.data;
}
