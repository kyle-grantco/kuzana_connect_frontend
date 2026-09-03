"use client";

// Small, quiet indicator of remaining weekly connection requests. Shown in the
// top nav so members spend their requests deliberately. Not loud — it's a cap
// reminder, not a countdown. Links to the requests page.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getRequestQuota } from "@/app/lib/connectionRequestService";
import { useConnectionQuota } from "@/app/store/connectionQuotaStore";

export default function ConnectionQuota() {
  const router = useRouter();
  const [quota, setQuota] = useState(null);
  const version = useConnectionQuota((s) => s.version);

  useEffect(() => {
    getRequestQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [version]); // refetch when a request is sent (version bumped)

  if (!quota || typeof quota.remaining !== "number") return null;

  const { remaining, limit } = quota;
  const low = remaining === 0;

  return (
    <button
      onClick={() => router.push("/connections/requests")}
      title={`${remaining} of ${limit} connection requests left this week`}
      className={
        "hidden items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex " +
        (low
          ? "border-slate-200 bg-slate-50 text-slate-400"
          : "border-slate-200 text-slate-500 hover:border-slate-300")
      }
    >
      <UserPlus size={12} />
      {remaining} left
    </button>
  );
}
