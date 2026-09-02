import Link from "next/link";

export const metadata = {
  title: "Kuzana Connect",
  description:
    "Connect finds the founders worth knowing in the Kuzana community for what you're working on, and brings them to you, so your next connection is one message away.",
};

// Two testimonials. The first is real. The second is a placeholder to be swapped
// for a real member quote before this goes out.
const TESTIMONIALS = [
  {
    initials: "WO",
    name: "Washington Ogol",
    role: "CEO, Nyumbani Greens",
    quote: "I won a Ksh 7M grant and Ksh 5M loan through the Kuzana platform.",
    tag: "Won grant and loan",
  },
  {
    initials: "JK",
    name: "James K.",
    role: "Founder, logistics",
    quote:
      "I found a business partner here. Someone already vouched for him, so I trusted the introduction from day one. We've been building together since.",
    tag: "Found a partner",
  },
];

const STEPS = [
  {
    n: "1",
    title: "The right members, brought to you",
    body: "Connect finds the members worth reaching out to for what you're working on, and shows you why each one fits.",
  },
  {
    n: "2",
    title: "Your introductions land",
    body: "Everyone here is part of the Kuzana community, and many are vouched for by members who've worked with them. So reaching out gets a reply, not silence.",
  },
  {
    n: "3",
    title: "It works both ways",
    body: "Members who need what you offer find you too, so the right connections happen from both sides.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-[100svh] bg-white font-sans text-brand-ink antialiased">
      {/* nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2 text-[1.02rem] font-bold text-brand-navy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kuzana-logo.png" alt="" className="h-[30px] w-auto" />
          <span>Kuzana Connect</span>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:border-brand-blue hover:bg-slate-50"
        >
          Log in
        </Link>
      </nav>

      <div className="mx-auto w-full max-w-6xl px-6 pb-8">
        {/* hero */}
        <section className="grid items-center gap-8 py-14 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:py-20">
          <div>
            <h1 className="text-[2.1rem] font-extrabold leading-[1.08] tracking-tight text-[#c8901a] sm:text-[2.7rem] md:text-[3.3rem]">
              Find the founder who&apos;s already solved your problem.
            </h1>
          </div>
          <div>
            <p className="text-[1.05rem] leading-relaxed text-slate-500 md:text-[1.25rem]">
              Connect finds the people worth knowing for what you&apos;re
              working on, and brings them to you, so your next connection is one
              message away.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-600"
              >
                Join Connect
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:border-slate-300"
              >
                Log in
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              For Kuzana community members. Use the access code from the
              WhatsApp group to join.
            </p>
          </div>
        </section>

        {/* testimonials */}
        <section aria-label="Member stories" className="pb-4">
          <div className="grid gap-4 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="m-0 flex flex-col gap-3.5 rounded-2xl border border-slate-100 bg-[#fdfdff] p-5"
              >
                <span className="self-start rounded-full bg-brand-yellow-100 px-2.5 py-1 text-xs font-semibold text-brand-yellow-700">
                  {t.tag}
                </span>
                <blockquote className="m-0 text-[0.95rem] leading-relaxed text-brand-navy">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-2.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
                    {t.initials}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-brand-navy">
                      {t.name}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {t.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="py-12">
          <h2 className="mb-6 text-[1.4rem] font-bold tracking-tight text-brand-navy md:text-[1.7rem]">
            How it works
          </h2>
          <div className="grid gap-7 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue-50 text-sm font-bold text-brand-blue">
                  {s.n}
                </span>
                <h3 className="text-[0.98rem] font-semibold text-brand-navy">
                  {s.title}
                </h3>
                <p className="m-0 text-[0.93rem] leading-relaxed text-slate-500">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          {/* closing CTA band */}
          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold text-brand-navy">
                Already in the Kuzana community? Join Connect
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Use the access code from the WhatsApp group. Already on Connect?{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-brand-blue hover:underline"
                >
                  Log in
                </Link>
                .
              </p>
            </div>
            <Link
              href="/auth/register"
              className="inline-flex flex-none items-center rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-600"
            >
              Join Connect
            </Link>
          </div>
        </section>

        <footer className="flex items-center gap-2 pt-4 text-xs text-slate-400">
          <Link href="/terms" target="_blank" className="hover:text-brand-blue">
            Terms
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            target="_blank"
            className="hover:text-brand-blue"
          >
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  );
}
