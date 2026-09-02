"use client";

// Route: /connections/requests
// The surface notifications, emails, and the account menu link to. Incoming
// requests (accept/decline) + outgoing (status). Wrapped in the app shell.

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ConnectionRequests from "@/app/components/app/ConnectionRequests";

export default function ConnectionRequestsPage() {
  const router = useRouter();
  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <h1 className="mb-4 text-lg font-semibold text-brand-navy">
        Connection requests
      </h1>
      <ConnectionRequests />
    </div>
  );
}
