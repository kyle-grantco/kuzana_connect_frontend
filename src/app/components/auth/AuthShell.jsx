import Logo from "../ui/Logo";

// Shared framing for all auth screens: centered card, logo, title, subtitle.
// - Card widens on larger screens (mobile stays compact) to cut white space.
// - No `overflow-hidden` on the card, so absolutely-positioned children like
//   the country dropdown can overlay outside the card bounds. The accent bar
//   carries its own rounded top corners instead.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* brand accent bar (rounded top to match the card) */}
          <div className="h-1.5 w-full rounded-t-2xl bg-brand-yellow" />
          <div className="p-7 sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3">
                <Logo size={48} />
              </div>
              <h1 className="text-base font-semibold text-brand-navy">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
        {footer && (
          <div className="mt-4 text-center text-xs text-slate-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
