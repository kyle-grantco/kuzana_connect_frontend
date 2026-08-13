"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Shared shell for the public policy pages (Terms, Privacy). Readable column,
// consistent typography, a back link, and cross-links between the two policies
// plus a link home. Public — no auth required.
export default function PolicyLayout({ title, lastUpdated, other, children }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft size={14} /> Back to Kuzana Connect
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-brand-navy">{title}</h1>
          {lastUpdated && (
            <p className="mt-1 text-xs text-slate-400">
              Last updated: {lastUpdated}
            </p>
          )}

          <div className="policy-body mt-6 text-sm leading-relaxed text-slate-600">
            {children}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-500">
            See also:{" "}
            <Link
              href={other.href}
              className="text-brand-blue underline hover:text-brand-blue-600"
            >
              {other.label}
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .policy-body h2 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .policy-body p {
          margin-bottom: 0.75rem;
        }
        .policy-body ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .policy-body li {
          margin-bottom: 0.35rem;
        }
      `}</style>
    </div>
  );
}
