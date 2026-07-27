import { Loader2 } from "lucide-react";

// Primary CTA (brand-blue, white text) with hover shade. Ghost variant for
// secondary actions. Uses the Tailwind brand theme.
export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}) {
  const base =
    "w-full rounded-lg px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-brand-blue text-white hover:bg-brand-blue-600"
      : "bg-transparent text-slate-500 hover:text-brand-navy";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
