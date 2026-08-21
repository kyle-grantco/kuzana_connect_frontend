import Link from "next/link";

export const metadata = {
  title: "Kuzana Connect",
  description:
    "A network where founders find the people they need, a trusted introduction away. A reliable service provider, advice from someone who's done it, an investor, among others.",
};

// Illustrative testimonials — PLACEHOLDER copy. Swap for real member quotes
// before this matters. Kept clearly generic so nothing misleads in the meantime.
const TESTIMONIALS = [
  {
    initials: "AM",
    name: "Amina M.",
    role: "Founder, agri-processing",
    quote:
      "I was introduced to an investor through Connect and closed the round I'd been chasing for months. The intro was warm, so the conversation actually happened.",
    tag: "Met an investor",
  },
  {
    initials: "JK",
    name: "James K.",
    role: "Founder, logistics",
    quote:
      "I found a business partner here. Someone already vouched for him, so I trusted the introduction from day one. We've been building together since.",
    tag: "Found a partner",
  },
  {
    initials: "WN",
    name: "Wanjiru N.",
    role: "Founder, consumer goods",
    quote:
      "A growth marketer I connected with fixed how we acquire customers. Sales are up and I stopped guessing. I'd never have reached her cold.",
    tag: "Met a growth marketer",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Reach people you couldn't on your own",
    body: "The service provider, partner, or investor you need is here, and you can actually get to them.",
  },
  {
    n: "2",
    title: "Your introductions land",
    body: "Every member was vouched for by someone already inside, so reaching out isn't a cold message to a stranger. It gets a reply.",
  },
  {
    n: "3",
    title: "You're findable too",
    body: "The founders who need what you offer can find you, and reach you with the same trust.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-[100svh] bg-white font-sans text-brand-ink antialiased">
      {/* nav: logo + accessible Login (members land here after logout) */}
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
        {/* hero: two columns on large screens — heading left, description right */}
        <section className="grid items-center gap-8 py-14 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:py-20">
          <h1 className="text-[2.1rem] font-extrabold leading-[1.08] tracking-tight text-[#c8901a] sm:text-[2.7rem] md:text-[3.3rem]">
            Your next big connection is already here.
          </h1>
          <p className="text-[1.05rem] leading-relaxed text-slate-500 md:text-[1.25rem]">
            A network where founders find the people they need, a trusted
            introduction away. A reliable service provider, advice from someone
            who&apos;s done it, an investor, among others.
          </p>
        </section>

        {/* testimonials: high on the page. This is what does the selling. */}
        <section aria-label="Member stories" className="pb-4">
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="m-0 flex flex-col gap-3.5 rounded-2xl border border-slate-100 bg-[#fdfdff] p-5"
              >
                <span className="self-start rounded-full bg-brand-yellow-100 px-2.5 py-1 text-xs font-semibold text-brand-yellow-700">
                  {t.tag}
                </span>
                <blockquote className="m-0 text-[0.95rem] leading-relaxed text-brand-navy">
                  “{t.quote}”
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

        {/* why it works: value first, subheading separated from description */}
        <section className="py-12">
          <h2 className="mb-6 text-[1.4rem] font-bold tracking-tight text-brand-navy md:text-[1.7rem]">
            Why it works
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

          <p className="mt-10 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-[0.92rem] leading-relaxed text-slate-500">
            Kuzana Connect is invite-only. If a member sent you a link, open it
            to join. Already a member?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-brand-blue hover:underline"
            >
              Log in
            </Link>
            .
          </p>
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
