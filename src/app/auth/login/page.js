"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import AuthTabs from "@/app/components/auth/AuthTabs";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import { sendOtp } from "@/app/lib/authService";
import { setPending } from "@/app/lib/pendingVerification";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!number.trim()) {
      setError("Please enter your WhatsApp number.");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(number);
      setPending({ whatsapp_number: number, flow: "login" });
      router.push("/auth/verify");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Couldn't send the code. Please try again.";
      setError(msg);
      notify(msg, "error", 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in with your WhatsApp number">
      <AuthTabs active="login" />
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+254 712 345 678"
          autoFocus
        />

        {error && <p className="text-xs text-brand-red">{error}</p>}

        <Button type="submit" loading={loading}>
          Send code
        </Button>
      </form>
    </AuthShell>
  );
}
