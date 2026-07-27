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
        router.replace("/"); // directory (mvp/done both land here)
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
      subtitle={`Sent to ${pending.whatsapp_number} on WhatsApp`}
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
