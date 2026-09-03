"use client";

// Route: /connections/requests
// The surface notifications, emails, and the account menu link to. Incoming
// requests (accept/decline) + outgoing (status). Wrapped in the app shell.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ConnectionRequests from "@/app/components/app/ConnectionRequests";
import { getRequestQuota } from "@/app/lib/connectionRequestService";
import { useConnectionQuota } from "@/app/store/connectionQuotaStore";

export default function ConnectionRequestsPage() {
  const router = useRouter();
  const [quota, setQuota] = useState(null);
  const version = useConnectionQuota((s) => s.version);

  useEffect(() => {
    getRequestQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [version]);

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <h1 className="mb-1 text-lg font-semibold text-brand-navy">
        Connection requests
      </h1>
      {quota && typeof quota.remaining === "number" && (
        <p className="mb-4 text-xs text-slate-400">
          You can send {quota.limit} connection request
          {quota.limit === 1 ? "" : "s"} a week.{" "}
          <span className="font-medium text-slate-500">
            {quota.remaining} left this week.
          </span>
        </p>
      )}
      {!quota && <div className="mb-4" />}
      <ConnectionRequests />
    </div>
  );
}
