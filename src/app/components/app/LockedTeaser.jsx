"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import Button from "@/app/components/ui/Button";

// Shown when a logged-in member hasn't completed their MVP profile.
// `variant`:
//   "overlay"  — sits over the (greyed) directory as a teaser
//   "block"    — full message for a page they can't view at all (e.g. someone
//                else's profile) until they complete their own.
export default function LockedTeaser({ variant = "overlay", message }) {
  const router = useRouter();

  const copy =
    message ||
    (variant === "block"
      ? "Complete your profile to view other members."
      : "Complete your profile to discover other members and be discovered.");

  if (variant === "block") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow-100">
          <Lock size={22} className="text-brand-yellow-700" />
        </div>
        <p className="mb-5 text-sm text-slate-600">{copy}</p>
        <div className="mx-auto max-w-xs">
          <Button onClick={() => router.push("/onboarding")}>
            Complete my profile
          </Button>
        </div>
      </div>
    );
  }

  // overlay
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[2px]">
      <div className="mx-auto max-w-sm px-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow-100">
          <Lock size={22} className="text-brand-yellow-700" />
        </div>
        <p className="mb-5 text-sm text-slate-600">{copy}</p>
        <div className="mx-auto max-w-xs">
          <Button onClick={() => router.push("/onboarding")}>
            Complete my profile
          </Button>
        </div>
      </div>
    </div>
  );
}
