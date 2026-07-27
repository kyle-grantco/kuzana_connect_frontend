import Link from "next/link";

// Login/Register switcher shown at the top of both auth pages.
// The active tab = current page; the inactive tab links to the other route.
// Keeps pages separate while giving an intuitive in-place switch feel.
export default function AuthTabs({ active }) {
  const tab = (label, href, isActive) =>
    isActive ? (
      <span className="flex-1 rounded-md bg-brand-blue py-2 text-center text-sm font-medium text-white">
        {label}
      </span>
    ) : (
      <Link
        href={href}
        className="flex-1 rounded-md py-2 text-center text-sm text-slate-500 transition-colors hover:text-brand-navy"
      >
        {label}
      </Link>
    );

  return (
    <div className="mb-5 flex gap-1 rounded-lg bg-slate-50 p-1">
      {tab("Log in", "/auth/login", active === "login")}
      {tab("Register", "/auth/register", active === "register")}
    </div>
  );
}
