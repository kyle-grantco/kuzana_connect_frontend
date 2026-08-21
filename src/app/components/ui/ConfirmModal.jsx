"use client";

// Reusable confirmation modal. Controlled by `open`; calls onConfirm / onClose.
//
// Categories tune the icon + accent + confirm-button colour:
//   danger  -> destructive (delete endorsement, delete account)
//   warning -> caution, reversible-ish (cancel invite)
//   confirm -> neutral yes/no (default)
//   info    -> acknowledgement
//
// Usage:
//   const [open, setOpen] = useState(false);
//   <ConfirmModal
//     open={open}
//     category="warning"
//     title="Cancel this invite?"
//     message="The link will stop working. This can't be undone."
//     confirmLabel="Cancel invite"
//     onConfirm={doCancel}
//     onClose={() => setOpen(false)}
//     loading={busy}
//   />

import { useEffect } from "react";
import { AlertTriangle, Trash2, HelpCircle, Info, X } from "lucide-react";

const CATEGORY = {
  danger: {
    Icon: Trash2,
    iconWrap: "bg-red-50 text-brand-red",
    confirmBtn: "bg-brand-red text-white hover:bg-brand-red-600",
  },
  warning: {
    Icon: AlertTriangle,
    iconWrap: "bg-amber-50 text-amber-500",
    confirmBtn: "bg-brand-yellow text-brand-navy hover:bg-brand-yellow-600",
  },
  confirm: {
    Icon: HelpCircle,
    iconWrap: "bg-brand-blue-50 text-brand-blue",
    confirmBtn: "bg-brand-blue text-white hover:bg-brand-blue-600",
  },
  info: {
    Icon: Info,
    iconWrap: "bg-slate-100 text-slate-500",
    confirmBtn: "bg-brand-blue text-white hover:bg-brand-blue-600",
  },
};

export default function ConfirmModal({
  open,
  category = "confirm",
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  loading = false,
}) {
  // close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !loading) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const cfg = CATEGORY[category] || CATEGORY.confirm;
  const Icon = cfg.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-brand-navy/40 backdrop-blur-[1px]"
        onClick={() => !loading && onClose?.()}
      />

      {/* card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          onClick={() => !loading && onClose?.()}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
          disabled={loading}
        >
          <X size={16} />
        </button>

        <div
          className={
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full " +
            cfg.iconWrap
          }
        >
          <Icon size={22} />
        </div>

        {title && (
          <h2 className="text-center text-base font-semibold text-brand-navy">
            {title}
          </h2>
        )}
        {message && (
          <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
            {message}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 " +
              cfg.confirmBtn
            }
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
