import Link from "next/link";

export const metadata = {
  title: "Kuzana Connect",
  description:
    "Find the right person for what you need, from our community of entrepreneurs.",
};

export default function LandingPage() {
  return (
    <main className="lp">
      <div className="lp__wrap">
        <header className="lp__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kuzana-logo.png" alt="" className="lp__mark" />
          <span>Kuzana Connect</span>
        </header>

        <section className="lp__hero">
          <div className="lp__copy">
            <h1 className="lp__lead">
              Find the right person for what you need.
            </h1>

            <p className="lp__rest">
              From our community of entrepreneurs, whether you&apos;re looking
              for a supplier, a partner, advice on cracking distribution, or
              someone who&apos;s done what you&apos;re trying to do. And be
              discovered too.
            </p>

            <div className="lp__cta">
              <Link href="/auth/register" className="lp__btn lp__btn--primary">
                Join now
              </Link>

              <Link href="/auth/login" className="lp__login">
                Login <span>→</span>
              </Link>
            </div>
          </div>

          <div className="lp__art" aria-hidden="true">
            <div className="lp__search">
              <span className="lp__search-icon">⌕</span>
              <span className="lp__search-text">
                a digital marketing advisor
              </span>
            </div>

            <div className="lp__cards">
              <MiniCard
                initials="LM"
                name="Lydia M."
                role="Marketing consultant"
                tags={["digital marketing", "brand strategy"]}
              />

              <MiniCard
                initials="TK"
                name="Tim K."
                role="Founder, growth studio"
                tags={["paid ads", "content strategy"]}
              />
            </div>
          </div>
        </section>

        <footer className="lp__footer">
          <Link href="/terms" target="blank">
            Terms
          </Link>
          <span>·</span>
          <Link href="/privacy" target="blank">
            Privacy
          </Link>
        </footer>
      </div>

      <div className="lp__wash" aria-hidden="true" />

      <style>{`
        :root {
          --kz-blue: #3b5a86;
          --kz-blue-strong: #34517a;
          --kz-yellow: #f0c060;
          --kz-ink: #17223b;
          --kz-slate: #5f6b82;
        }

        .lp {
          position: relative;
          min-height: 100svh;
          background: #ffffff;
          color: var(--kz-ink);
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .lp__wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 72rem;
          min-height: 100svh;
          margin: 0 auto;
          padding: 1.6rem 1.5rem 1.2rem;
          display: flex;
          flex-direction: column;
        }

        .lp__brand {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 1.02rem;
          font-weight: 700;
          color: var(--kz-ink);
        }

        .lp__mark {
          height: 30px;
          width: auto;
        }

        .lp__hero {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3.5rem;
          align-items: center;
          min-height: calc(100svh - 7rem);
        }

        .lp__copy {
          max-width: 34rem;
        }

        .lp__lead {
          margin: 0 0 1rem;
          font-size: clamp(2.2rem, 4.8vw, 3.3rem);
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--kz-yellow);
        }

        .lp__rest {
          max-width: 32rem;
          margin: 0 0 2rem;
          font-size: clamp(1.05rem, 2.2vw, 1.3rem);
          line-height: 1.5;
          font-weight: 400;
          color: var(--kz-slate);
        }

        .lp__cta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .lp__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.85rem 1.8rem;
          border-radius: 0.7rem;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          transition:
            transform 0.15s ease,
            background 0.15s ease,
            box-shadow 0.15s ease;
        }

        .lp__btn--primary {
          background: var(--kz-blue);
          color: #ffffff;
          box-shadow: 0 12px 24px -12px rgba(59, 90, 134, 0.75);
        }

        .lp__btn--primary:hover {
          background: var(--kz-blue-strong);
          transform: translateY(-1px);
        }

        .lp__login {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--kz-blue);
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
        }

        .lp__login span {
          font-size: 1.1rem;
          transition: transform 0.15s ease;
        }

        .lp__login:hover span {
          transform: translateX(2px);
        }

        .lp__art {
          position: relative;
          background: #fdfdff;
          border: 1px solid #eef1f7;
          border-radius: 1.15rem;
          padding: 1.25rem;
          box-shadow: 0 34px 64px -36px rgba(23, 34, 59, 0.42);
        }

        .lp__search {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #ffffff;
          border: 1px solid #e6ebf3;
          border-radius: 0.75rem;
          padding: 0.8rem 1rem;
          margin-bottom: 1rem;
        }

        .lp__search-icon {
          color: var(--kz-blue);
          font-size: 1.15rem;
        }

        .lp__search-text {
          color: var(--kz-slate);
          font-size: 0.92rem;
        }

        .lp__cards {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .lp__card {
          background: #ffffff;
          border: 1px solid #eef1f7;
          border-radius: 0.85rem;
          padding: 0.9rem 1rem;
          display: flex;
          gap: 0.8rem;
          align-items: flex-start;
        }

        .lp__av {
          height: 40px;
          width: 40px;
          flex: none;
          border-radius: 50%;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--kz-blue);
        }

        .lp__name {
          font-weight: 600;
          color: var(--kz-ink);
          font-size: 0.94rem;
        }

        .lp__role {
          color: #94a0b8;
          font-size: 0.8rem;
          margin-bottom: 0.5rem;
        }

        .lp__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .lp__tag {
          font-size: 0.74rem;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: #eef2fa;
          color: var(--kz-blue);
        }

        .lp__footer {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding-top: 1rem;
          color: #9aa4b7;
          font-size: 0.78rem;
        }

        .lp__footer a {
          color: inherit;
          text-decoration: none;
        }

        .lp__footer a:hover {
          color: var(--kz-blue);
        }

        .lp__wash {
          position: absolute;
          z-index: 0;
          right: -14%;
          top: 4%;
          width: 50vmax;
          height: 50vmax;
          border-radius: 50%;
          background:
            radial-gradient(
              closest-side,
              rgba(240, 192, 96, 0.2),
              transparent 68%
            ),
            radial-gradient(
              closest-side,
              rgba(59, 90, 134, 0.1),
              transparent 75%
            );
          filter: blur(6px);
          pointer-events: none;
        }

        @media (max-width: 860px) {
          .lp__wrap {
            min-height: auto;
          }

          .lp__hero {
            grid-template-columns: 1fr;
            gap: 2.25rem;
            min-height: 0;
            padding: 3.5rem 0 2rem;
          }

          .lp__lead {
            font-size: clamp(2rem, 8.5vw, 2.7rem);
          }

          .lp__art {
            max-width: 38rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp__btn,
          .lp__login span {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}

function MiniCard({ initials, name, role, tags }) {
  return (
    <div className="lp__card">
      <div className="lp__av">{initials}</div>

      <div>
        <div className="lp__name">{name}</div>
        <div className="lp__role">{role}</div>

        <div className="lp__tags">
          {tags.map((tag) => (
            <span key={tag} className="lp__tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
