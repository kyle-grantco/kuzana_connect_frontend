// Admin / super_admin API calls. All require an admin+ role server-side.
import { authRequest } from "./api";

export async function getMetrics({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const qs = params.toString();
  const res = await authRequest.get(`/admin/metrics${qs ? `?${qs}` : ""}`);
  return res.data;
}

export async function getMetricCount({ metric, from, to }) {
  const params = new URLSearchParams();
  params.set("metric", metric);
  params.set("date_from", from);
  params.set("date_to", to);
  const res = await authRequest.get(
    `/admin/metrics/count?${params.toString()}`,
  );
  return res.data; // { metric, from, to, count }
}

export async function listUsers({
  status,
  q,
  inviters_only,
  page = 1,
  size = 20,
} = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (inviters_only) params.set("inviters_only", "true");
  params.set("page", page);
  params.set("size", size);
  const res = await authRequest.get(`/admin/users?${params.toString()}`);
  return res.data; // { total, page, size, results }
}

// GET /admin/connections -> { total, page, size, results:[{requester, recipient, status, ...}] }
export async function listConnectionRequests({
  status,
  page = 1,
  size = 25,
} = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("size", size);
  const res = await authRequest.get(`/admin/connections?${params.toString()}`);
  return res.data;
}

// GET /admin/comms -> { total, page, size, results:[{ran_at, emails_sent, ...}] }
export async function listCommsRuns({ page = 1, size = 25 } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("size", size);
  const res = await authRequest.get(`/admin/comms?${params.toString()}`);
  return res.data;
}

export async function adminViewUser(memberNumber) {
  const res = await authRequest.get(`/admin/users/${memberNumber}`);
  return res.data; // { user, profile }
}

// super_admin only
export async function suspendUser(memberNumber) {
  return (await authRequest.post(`/admin/users/${memberNumber}/suspend`)).data;
}
export async function activateUser(memberNumber) {
  return (await authRequest.post(`/admin/users/${memberNumber}/activate`)).data;
}
export async function deleteUser(memberNumber) {
  return (await authRequest.delete(`/admin/users/${memberNumber}`)).data;
}
export async function setUserRole(memberNumber, role) {
  return (
    await authRequest.post(`/admin/users/${memberNumber}/role?role=${role}`)
  ).data;
}
