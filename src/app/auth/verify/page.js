"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import { verifyOtp, sendOtp } from "@/app/lib/authService";
import { getPending, clearPending } from "@/app/lib/pendingVerification";
import { useNotificationStore } from "@/app/store/notificationStore";

const RESEND_SECONDS = 60;

export default function VerifyPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [pending, setPendingState] = useState(undefined); // undefined = loading
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const timerRef = useRef(null);

  // Load persisted flow state (survives refresh / WhatsApp round-trip)
  useEffect(() => {
    const p = getPending();
    if (!p) {
      router.replace("/auth/login");
      return;
    }
    setPendingState(p);
  }, [router]);

  // resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [cooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Enter the code sent to your WhatsApp.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtp({
        whatsapp_number: pending.whatsapp_number,
        otp: otp.trim(),
        remember_device: remember,
      });
      clearPending();
      // new members (no profile yet) see the welcome + member number, then onboarding.
      // returning members with a profile go straight into the app.
      if (res.onboarding_status === "not_started") {
        router.replace("/welcome");
      } else {
        router.replace("/members"); // directory (mvp/done both land here)
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Invalid or expired code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !pending) return;
    setError("");
    try {
      await sendOtp(pending.whatsapp_number);
      notify("A new code has been sent.", "success", 3000);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Couldn't resend the code.";
      setError(msg);
    }
  }

  if (pending === undefined) return null;

  return (
    <AuthShell
      title="Enter your code"
      footer={
        pending.flow === "login" ? (
          <button
            onClick={() => {
              clearPending();
              router.replace("/auth/login");
            }}
            className="text-brand-blue hover:text-brand-blue-600"
          >
            Use a different number
          </button>
        ) : null
      }
    >
      {/* Single WhatsApp cue with the number — many users default to expecting an
          SMS, so we make it unmistakable the code is on WhatsApp. */}
      <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-[#25D366]/10 px-3 py-2.5 text-sm font-medium text-[#128C7E]">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="currentColor"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span>Code sent on WhatsApp to {pending.whatsapp_number}</span>
      </div>

      <form onSubmit={handleVerify} className="space-y-3">
        <Input
          label="6-digit code"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="• • • • • •"
          autoFocus
          className="text-center text-lg tracking-[0.4em] bg-brand-yellow-50 border-brand-yellow-100 focus:border-brand-yellow focus:ring-brand-yellow/25"
        />

        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-brand-blue"
          />
          Remember this device
        </label>

        {error && <p className="text-xs text-brand-red">{error}</p>}

        <Button type="submit" loading={loading}>
          Verify &amp; continue
        </Button>

        <div className="text-center text-xs text-slate-500">
          {cooldown > 0 ? (
            <span>Resend code in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-brand-blue hover:text-brand-blue-600"
            >
              Resend code
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
