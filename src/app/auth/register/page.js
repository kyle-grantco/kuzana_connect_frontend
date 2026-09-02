"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/app/components/auth/AuthShell";
import AuthTabs from "@/app/components/auth/AuthTabs";
import Input from "@/app/components/ui/Input";
import PhoneInput from "@/app/components/ui/PhoneInput";
import Button from "@/app/components/ui/Button";
import { register, verifyCommunityCode, sendOtp } from "@/app/lib/authService";
import { setPending } from "@/app/lib/pendingVerification";
import {
  getPendingInvite,
  setPendingInvite,
  clearPendingInvite,
} from "@/app/lib/pendingInvite";
import { useNotificationStore } from "@/app/store/notificationStore";

// Invite-only: registration requires a token. Source of truth is the ?invite=
// query param (survives refresh/new-tab/bookmark); sessionStorage is a fallback
// for in-app navigations that drop the query. With neither, we show a blocked
// state instead of the form — you can't self-register into Kuzana Connect.
function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotificationStore();

  const [inviteToken, setInviteToken] = useState(undefined); // undefined = resolving
  const [communityCode, setCommunityCode] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    whatsapp_number: "",
    email: "",
  });
  const [country, setCountry] = useState("KE");
  const [localPhone, setLocalPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [channel, setChannel] = useState("whatsapp"); // "whatsapp" | "email"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Resolve the invite token once on mount: query param wins, else the
  // sessionStorage mirror. Persist the query param into the mirror so a later
  // refresh that somehow drops the query still holds.
  useEffect(() => {
    const fromQuery = searchParams.get("invite");
    if (fromQuery) {
      setPendingInvite(fromQuery);
      setInviteToken(fromQuery);
      return;
    }
    setInviteToken(getPendingInvite());
  }, [searchParams]);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Validate only; no API call until the number is confirmed.
  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim() || !form.email.trim() || !localPhone.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!inviteToken && !communityCode.trim()) {
      setError("Enter the community access code to join.");
      return;
    }
    if (!phoneValid || !form.whatsapp_number) {
      setError(
        "Please enter a valid WhatsApp number for the selected country.",
      );
      return;
    }
    if (!agreed) {
      setError(
        "Please agree to the Terms and Privacy Policy to create your account.",
      );
      return;
    }
    // Validate the community code up-front (invited users skip this). Skip if
    // already verified (e.g. they went back to edit and returned).
    if (!inviteToken && !codeVerified) {
      setVerifyingCode(true);
      try {
        await verifyCommunityCode(communityCode.trim());
        setCodeVerified(true);
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          "That community access code isn't valid. Check it and try again.";
        setError(msg);
        return;
      } finally {
        setVerifyingCode(false);
      }
    }
    setStep("confirm");
  }

  // Number confirmed — create the account + send OTP now.
  async function handleSendCode() {
    setError("");
    setLoading(true);
    try {
      await register({
        ...form,
        invite_token: inviteToken || undefined,
        community_code: inviteToken ? undefined : communityCode.trim(),
      });
      // register auto-sends the code by WhatsApp. If they chose email, deliver
      // it there instead (same code, keyed by number).
      if (channel === "email") {
        try {
          await sendOtp(form.whatsapp_number, "email");
        } catch {
          // if the email resend fails, they still have the WhatsApp code + can
          // resend from the verify screen; don't block the flow.
        }
      }
      clearPendingInvite();
      setPending({
        whatsapp_number: form.whatsapp_number,
        email: form.email,
        flow: "register",
        channel,
      });
      router.push("/auth/verify");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Couldn't create your account. Please try again.";
      setError(msg);
      notify(msg, "error", 4000);
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  // Still resolving the token — render nothing to avoid a flash of either state.
  if (inviteToken === undefined) return null;

  return (
    <AuthShell
      title={step === "form" ? "Create your account" : "Get your code"}
      subtitle={
        step === "form"
          ? inviteToken
            ? "Accept your invitation to join"
            : "Join the Kuzana founder community"
          : undefined
      }
    >
      {step === "form" ? (
        <>
          <AuthTabs active="register" />
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={update("full_name")}
              placeholder="John Doe"
              autoFocus
            />
            <PhoneInput
              country={country}
              onCountryChange={setCountry}
              value={localPhone}
              onChange={(local, e164, valid) => {
                setLocalPhone(local);
                setPhoneValid(valid);
                setForm((f) => ({ ...f, whatsapp_number: e164 || "" }));
              }}
            />
            <Input
              label="Email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
            />

            {!inviteToken && (
              <Input
                label="Community access code"
                value={communityCode}
                onChange={(e) => setCommunityCode(e.target.value)}
                placeholder="From the Kuzana community"
              />
            )}

            {/* Terms + Privacy consent */}
            <label className="flex items-start gap-2 pt-1 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setError("");
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-brand-blue underline hover:text-brand-blue-600"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-brand-blue underline hover:text-brand-blue-600"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-xs text-brand-red">{error}</p>}

            <Button type="submit" loading={verifyingCode}>
              Create account
            </Button>
          </form>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-xs text-slate-500">
            Where should we send your verification code?
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={
                "flex w-full items-center justify-between rounded-xl border p-3 text-left " +
                (channel === "whatsapp"
                  ? "border-brand-blue bg-brand-blue-50"
                  : "border-slate-200 hover:border-slate-300")
              }
            >
              <span>
                <span className="block text-xs font-medium text-slate-500">
                  WhatsApp
                </span>
                <span className="block text-sm text-brand-navy">
                  {form.whatsapp_number}
                </span>
              </span>
              {channel === "whatsapp" && (
                <span className="text-xs font-medium text-brand-blue">
                  Selected
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setChannel("email")}
              className={
                "flex w-full items-center justify-between rounded-xl border p-3 text-left " +
                (channel === "email"
                  ? "border-brand-blue bg-brand-blue-50"
                  : "border-slate-200 hover:border-slate-300")
              }
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-500">
                  Email
                </span>
                <span className="block truncate text-sm text-brand-navy">
                  {form.email}
                </span>
              </span>
              {channel === "email" && (
                <span className="text-xs font-medium text-brand-blue">
                  Selected
                </span>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            WhatsApp is fastest. Use email if you can&apos;t receive WhatsApp.
          </p>

          {error && <p className="text-xs text-brand-red">{error}</p>}

          <Button onClick={handleSendCode} loading={loading}>
            Send code
          </Button>
          <Button
            variant="ghost"
            onClick={() => setStep("form")}
            disabled={loading}
          >
            Edit details
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

// useSearchParams requires a Suspense boundary in the App Router.
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}
