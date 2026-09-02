// Connection request flow (double opt-in) + notifications.
import { authRequest } from "./api";

// POST /connection-requests { recipient_id, message } -> { request, remaining }
export async function sendConnectionRequest(recipientId, message) {
  const res = await authRequest.post("/connection-requests", {
    recipient_id: recipientId,
    message,
  });
  return res.data;
}

export async function acceptConnectionRequest(requestId) {
  const res = await authRequest.post(
    `/connection-requests/${requestId}/accept`,
  );
  return res.data;
}

export async function declineConnectionRequest(requestId) {
  const res = await authRequest.post(
    `/connection-requests/${requestId}/decline`,
  );
  return res.data;
}

// pending requests to me
export async function getIncomingRequests() {
  const res = await authRequest.get("/connection-requests/incoming");
  return res.data;
}

// my sent requests + status
export async function getOutgoingRequests() {
  const res = await authRequest.get("/connection-requests/outgoing");
  return res.data;
}

// { remaining, limit }
export async function getRequestQuota() {
  const res = await authRequest.get("/connection-requests/quota");
  return res.data;
}

// ── notifications ────────────────────────────────────────────────────────────
export async function getNotifications({ limit } = {}) {
  const qs = limit ? `?limit=${limit}` : "";
  const res = await authRequest.get(`/notifications${qs}`);
  return res.data;
}

export async function getUnreadCount() {
  const res = await authRequest.get("/notifications/unread-count");
  return res.data; // { count }
}

export async function markNotificationsRead(ids) {
  const res = await authRequest.post("/notifications/read", ids ? { ids } : {});
  return res.data;
}

export async function markNotificationRead(id) {
  const res = await authRequest.post(`/notifications/${id}/read`);
  return res.data;
}
