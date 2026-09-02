// Invite API calls (authenticated — use authRequest so CSRF + refresh apply).
import { authRequest } from "./api";

// POST /invites -> create an invite. Returns { id, token, invitee_name, status }.
export async function createInvite({
  invitee_name,
  relationship_type,
  remarks,
  engaged_from,
  engaged_to,
}) {
  const res = await authRequest.post("/invites", {
    invitee_name,
    relationship_type,
    remarks,
    engaged_from,
    engaged_to: engaged_to || null,
  });
  return res.data;
}

// GET /invites -> my invites (pending + joined only), paginated.
// Returns { items, total, page, page_size }.
export async function listMyInvites({ page = 1, page_size = 10 } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("page_size", page_size);
  const res = await authRequest.get(`/invites?${params.toString()}`);
  return res.data;
}

// PATCH /invites/{id} -> edit a pending invite. Any subset of fields.
export async function updateInvite(inviteId, patch) {
  const res = await authRequest.patch(`/invites/${inviteId}`, patch);
  return res.data;
}

// POST /invites/{id}/cancel -> soft-cancel a pending invite.
export async function cancelInvite(inviteId) {
  const res = await authRequest.post(`/invites/${inviteId}/cancel`);
  return res.data;
}

// Build the shareable invite link from a token. Uses the public site origin.
export function inviteLink(token) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/invite/${token}`;
}

// GET /invites/invited-by/{user_id} -> { inviter | null }.
// The permanent "invited by" fact for a member (read from invites, not
// endorsements). Used on the profile header.
export async function invitedBy(userId) {
  const res = await authRequest.get(`/invites/invited-by/${userId}`);
  return res.data?.inviter || null;
}

// GET /invites/admin/user/{user_id} -> a member's invites (admin only).
// Shows all statuses. Returns { items, total, page, page_size }.
export async function adminListUserInvites(
  userId,
  { page = 1, page_size = 20 } = {},
) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("page_size", page_size);
  const res = await authRequest.get(
    `/invites/admin/user/${userId}?${params.toString()}`,
  );
  return res.data;
}
