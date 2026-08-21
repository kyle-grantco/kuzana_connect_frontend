"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/app/components/auth/AuthShell";
import AuthTabs from "@/app/components/auth/AuthTabs";
import Input from "@/app/components/ui/Input";
import PhoneInput from "@/app/components/ui/PhoneInput";
import Button from "@/app/components/ui/Button";
import { register } from "@/app/lib/authService";
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
  function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim() || !form.email.trim() || !localPhone.trim()) {
      setError("Please fill in all fields.");
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
    setStep("confirm");
  }

  // Number confirmed — create the account + send OTP now.
  async function handleSendCode() {
    setError("");
    setLoading(true);
    try {
      await register({ ...form, invite_token: inviteToken });
      clearPendingInvite(); // token now carried on the user row server-side
      setPending({ whatsapp_number: form.whatsapp_number, flow: "register" });
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

  // No invite -> blocked. Invite-only entry, no self-registration.
  if (!inviteToken) {
    return (
      <AuthShell
        title="Kuzana Connect is invite-only"
        subtitle="You need an invite link from a member to join."
      >
        <div className="space-y-4 text-center">
          <p className="text-sm leading-relaxed text-slate-500">
            If someone sent you an invite link, open it to continue.
          </p>
          <Link
            href="/auth/login"
            className="inline-block text-sm text-brand-blue hover:text-brand-blue-600"
          >
            Already a member? Log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === "form" ? "Create your account" : "Confirm your number"}
      subtitle={step === "form" ? "Accept your invitation to join" : undefined}
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

            <Button type="submit">Create account</Button>
          </form>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-yellow-100 bg-brand-yellow-50 p-4 text-center">
            <div className="text-lg font-semibold tracking-wide text-brand-navy">
              {form.whatsapp_number}
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            A verification code will be sent to this WhatsApp number.
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
            Edit number
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
