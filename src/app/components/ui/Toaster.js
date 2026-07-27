"use client";

import { useNotificationStore } from "@/app/store/notificationStore";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// Renders the notifications held in the store as stacked toasts (top-right).
// Mount ONCE, high in the tree — add <Toaster /> to src/app/layout.js.
// Reads `notifications`; calls `dismiss` on click / auto-dismiss (handled in store).

const STYLES = {
  success: {
    icon: CheckCircle2,
    ring: "border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
  error: {
    icon: XCircle,
    ring: "border-red-200",
    bar: "bg-brand-red",
    text: "text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    ring: "border-amber-200",
    bar: "bg-brand-yellow",
    text: "text-amber-800",
  },
  info: {
    icon: Info,
    ring: "border-slate-200",
    bar: "bg-brand-blue",
    text: "text-slate-700",
  },
};

export default function Toaster() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (!notifications.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-xs flex-col gap-2">
      {notifications.map((n) => {
        const cfg = STYLES[n.type] || STYLES.info;
        const Icon = cfg.icon;
        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-2 overflow-hidden rounded-lg border ${cfg.ring} bg-white p-3 shadow-md`}
          >
            <span className={`mt-0.5 ${cfg.text}`}>
              <Icon size={16} />
            </span>
            <p className="flex-1 text-xs leading-relaxed text-slate-700">
              {n.message}
            </p>
            <button
              onClick={() => dismiss(n.id)}
              className="text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
