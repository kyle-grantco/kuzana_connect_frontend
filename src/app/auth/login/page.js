"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/app/components/auth/AuthShell";
import AuthTabs from "@/app/components/auth/AuthTabs";
import Input from "@/app/components/ui/Input";
import PhoneInput from "@/app/components/ui/PhoneInput";
import Button from "@/app/components/ui/Button";
import { sendOtp } from "@/app/lib/authService";
import { setPending } from "@/app/lib/pendingVerification";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [country, setCountry] = useState("KE");
  const [localPhone, setLocalPhone] = useState("");
  const [number, setNumber] = useState(""); // stored E.164
  const [phoneValid, setPhoneValid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!phoneValid || !number) {
      setError(
        "Please enter a valid WhatsApp number for the selected country.",
      );
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
        <PhoneInput
          country={country}
          onCountryChange={setCountry}
          value={localPhone}
          onChange={(local, e164, valid) => {
            setLocalPhone(local);
            setPhoneValid(valid);
            setNumber(e164 || "");
          }}
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
