// Admin / super_admin API calls. All require an admin+ role server-side.
import { authRequest } from "./api";

export async function getMetrics() {
  const res = await authRequest.get("/admin/metrics");
  return res.data;
}

export async function listUsers({ status, q, page = 1, size = 25 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  params.set("page", page);
  params.set("size", size);
  const res = await authRequest.get(`/admin/users?${params.toString()}`);
  return res.data; // { total, page, size, results }
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
