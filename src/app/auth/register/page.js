"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import AuthTabs from "@/app/components/auth/AuthTabs";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import { register } from "@/app/lib/authService";
import { setPending } from "@/app/lib/pendingVerification";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function RegisterPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [form, setForm] = useState({
    full_name: "",
    whatsapp_number: "",
    email: "",
  });
  const [step, setStep] = useState("form"); // "form" | "confirm"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Validate only; no API call until the number is confirmed.
  function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (
      !form.full_name.trim() ||
      !form.whatsapp_number.trim() ||
      !form.email.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }
    setStep("confirm");
  }

  // Number confirmed — create the account + send OTP now.
  async function handleSendCode() {
    setError("");
    setLoading(true);
    try {
      await register(form);
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

  return (
    <AuthShell
      title={step === "form" ? "Create your account" : "Confirm your number"}
      subtitle={
        step === "form" ? "Discover and connect with members" : undefined
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
              placeholder="Abraham Mwangi"
              autoFocus
            />
            <Input
              label="WhatsApp number"
              type="tel"
              inputMode="tel"
              value={form.whatsapp_number}
              onChange={update("whatsapp_number")}
              placeholder="+254 712 345 678"
            />
            <Input
              label="Email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
            />

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
