import Logo from "../ui/Logo";

// Shared framing for all auth screens: centered card, logo, title, subtitle.
// Themed with a brand-yellow top accent bar so the auth surface feels branded.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* brand accent bar */}
          <div className="h-1.5 w-full bg-brand-yellow" />
          <div className="p-7">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3">
                <Logo />
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
