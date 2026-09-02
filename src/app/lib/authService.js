// Connect auth API calls. Registration/login/verify are pre-auth, so they use
// publicRequest. verifyOtp stores the returned csrf_token + role in the auth
// store, which authRequest then uses for all subsequent authenticated calls.

import { publicRequest } from "./api";
import { useAuthStore } from "@/app/store/authStore";

// GET /invites/check/{token} -> validate an invite token (public, pre-auth).
// Returns { valid, inviter_name?, inviter_member_number?, inviter_photo_url?, reason? }
export async function checkInviteToken(token) {
  const res = await publicRequest.get(
    `/invites/check/${encodeURIComponent(token)}`,
  );
  return res.data;
}

// POST /auth/register -> creates account + auto-sends OTP.
// Entry needs EITHER an invite_token OR the community_code (invite bypasses code).
export async function register({
  full_name,
  whatsapp_number,
  email,
  invite_token,
  community_code,
}) {
  const res = await publicRequest.post("/auth/register", {
    full_name,
    whatsapp_number,
    email,
    invite_token,
    community_code,
  });
  return res.data;
}

// POST /auth/verify_code -> validate ONLY the community access code (gates the
// first registration step before collecting phone/OTP). Throws on a wrong code.
export async function verifyCommunityCode(community_code) {
  const res = await publicRequest.post("/auth/verify_code", { community_code });
  return res.data;
}

// POST /auth/send_otp -> send/resend OTP to an existing account (login + resend)
export async function sendOtp(whatsapp_number, channel = "whatsapp") {
  const res = await publicRequest.post("/auth/send_otp", {
    whatsapp_number,
    channel,
  });
  return res.data;
}

// POST /auth/verify_otp -> verify code, establish session
// returns { message, csrf_token, onboarding_status, account_status }
export async function verifyOtp({
  whatsapp_number,
  otp,
  remember_device = false,
}) {
  const res = await publicRequest.post("/auth/verify_otp", {
    whatsapp_number,
    otp,
    remember_device,
  });
  const data = res.data;
  // session is now established; persist CSRF (and role if present) for authRequest
  if (data?.csrf_token) useAuthStore.getState().setCsrfToken(data.csrf_token);
  if (data?.role) useAuthStore.getState().setRole(data.role);
  if (data?.member_number != null)
    useAuthStore.getState().setMemberNumber(data.member_number);
  return data;
}
