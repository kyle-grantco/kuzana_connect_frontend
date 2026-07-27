// Connect auth API calls. Registration/login/verify are pre-auth, so they use
// publicRequest. verifyOtp stores the returned csrf_token + role in the auth
// store, which authRequest then uses for all subsequent authenticated calls.

import { publicRequest } from "./api";
import { useAuthStore } from "@/app/store/authStore";

// POST /auth/register -> creates account + auto-sends OTP
export async function register({ full_name, whatsapp_number, email }) {
  const res = await publicRequest.post("/auth/register", {
    full_name,
    whatsapp_number,
    email,
  });
  return res.data;
}

// POST /auth/send_otp -> send/resend OTP to an existing account (login + resend)
export async function sendOtp(whatsapp_number) {
  const res = await publicRequest.post("/auth/send_otp", { whatsapp_number });
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
