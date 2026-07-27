"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";
import AuthShell from "@/app/components/auth/AuthShell";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/app/store/authStore";

// Shown once, right after verification. The member number is passed via the
// auth store (set on verify). If it's missing (e.g. direct nav), we still let
// them continue to onboarding.
export default function WelcomePage() {
  const router = useRouter();
  const memberNumber = useAuthStore((s) => s.memberNumber);
  const [num, setNum] = useState(null);

  useEffect(() => {
    setNum(memberNumber ?? null);
  }, [memberNumber]);

  return (
    <AuthShell title="Welcome to Kuzana Connect">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellow-100">
          <Users size={28} className="text-brand-yellow-700" />
        </div>

        {num != null ? (
          <>
            <p className="text-sm text-slate-500">You&apos;re</p>
            <p className="my-1 text-2xl font-semibold text-brand-navy">
              Member #{num}
            </p>
          </>
        ) : (
          <p className="my-1 text-lg font-semibold text-brand-navy">
            You&apos;re in
          </p>
        )}

        <p className="mb-6 mt-2 text-sm leading-relaxed text-slate-600">
          Set up your profile to discover other members and be discovered.
        </p>

        <Button onClick={() => router.push("/onboarding")}>
          <span className="flex items-center gap-2">
            Set up my profile <ArrowRight size={16} />
          </span>
        </Button>
      </div>
    </AuthShell>
  );
}
