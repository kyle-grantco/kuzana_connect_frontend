// Profile / directory API calls (authenticated — use authRequest so CSRF +
// refresh interceptors apply).
import { authRequest } from "./api";

export async function getIndustries() {
  const res = await authRequest.get("/industries");
  return res.data; // [{id, label}]
}

export async function saveMvpProfile(payload) {
  // payload: { title, business_name?, intro?, location, industry_ids[], offerings[], looking_for[] }
  const res = await authRequest.post("/profiles/mvp", payload);
  return res.data;
}

export async function saveEnrichment(payload) {
  // payload: { photo_url?, primary_link?, links? }
  const res = await authRequest.post("/profiles/enrichment", payload);
  return res.data;
}

export async function getMyProfile() {
  const res = await authRequest.get("/profiles/me");
  return res.data; // { user, profile }
}

export async function updateProfile(payload) {
  const res = await authRequest.patch("/profiles", payload);
  return res.data;
}

export async function deleteAccount() {
  const res = await authRequest.delete("/profiles");
  return res.data;
}

export async function getMember(memberNumber) {
  const res = await authRequest.get(`/members/${memberNumber}`);
  return res.data;
}

export async function searchMembers({
  q,
  direction = "offering",
  industry = [],
  location,
  page = 1,
  size = 20,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("direction", direction);
  if (location) params.set("location", location);
  industry.forEach((id) => params.append("industry", id));
  params.set("page", page);
  params.set("size", size);
  const res = await authRequest.get(`/search?${params.toString()}`);
  return res.data; // { total, page, size, results }
}
