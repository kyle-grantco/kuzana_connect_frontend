"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AuthShell from "@/app/components/auth/AuthShell";
import Button from "@/app/components/ui/Button";
import { useAuthStore } from "@/app/store/authStore";
import { getMyProfile } from "@/app/lib/profileService";
import { slugify } from "@/app/lib/slug";

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

  // Already-onboarded users don't belong on the welcome screen. Check the
  // backend (survives reload) and silently redirect them to their profile.
  // Rendered optimistically so genuine new members aren't gated on the request.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await getMyProfile();
        const status = me?.profile?.completion_status;
        const n = me?.user?.member_number;
        if (active && (status === "mvp" || status === "done") && n != null) {
          router.replace(`/members/${slugify(me.user.full_name || "")}-${n}`);
        }
      } catch {
        // check failed — let them continue to onboarding
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <AuthShell title="Welcome to Kuzana Connect">
      <div className="flex flex-col items-center text-center">
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
          Set up your profile to discover and connect with other members in our
          business community.
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
