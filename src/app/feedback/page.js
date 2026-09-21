"use client";

// Route: /feedback?token=...
// Public page (no login) that the day-5 connection follow-up email links to.
// Captures whether the member reached out, whether the connection was useful,
// a relevance score, and an optional note. Tokenized (identifies rater + other).

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyFeedbackToken, submitFeedback } from "@/app/lib/commsService";

function FeedbackInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState("loading"); // loading | ready | invalid | done
  const [otherName, setOtherName] = useState("");
  const [reachedOut, setReachedOut] = useState(null);
  const [useful, setUseful] = useState(null);
  const [score, setScore] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    verifyFeedbackToken(token)
      .then((r) => {
        if (r?.ok) {
          setOtherName(r.other_name || "your connection");
          setState("ready");
        } else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function submit() {
    setSaving(true);
    try {
      await submitFeedback({
        token,
        reached_out: reachedOut,
        useful,
        relevance_score: score,
        note: note.trim() || null,
      });
      setState("done");
    } catch {
      setSaving(false);
    }
  }

  const card =
    "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm";
  const pill = (active) =>
    "rounded-full border px-4 py-2 text-sm transition-colors " +
    (active
      ? "border-brand-blue bg-brand-blue text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-yellow-50 px-4 py-10">
      <div className={card}>
        <div className="mb-5 inline-flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-yellow text-xs font-extrabold text-brand-navy">
            K
          </span>
          <span className="text-sm font-bold text-brand-navy">
            Kuzana Connect
          </span>
        </div>

        {state === "loading" && (
          <p className="text-sm text-slate-500">Loading…</p>
        )}

        {state === "invalid" && (
          <>
            <h1 className="mb-2 text-lg font-semibold text-brand-navy">
              Link not valid
            </h1>
            <p className="text-sm text-slate-500">
              This feedback link is invalid or has expired.
            </p>
          </>
        )}

        {state === "done" && (
          <>
            <h1 className="mb-2 text-lg font-semibold text-brand-navy">
              Thank you
            </h1>
            <p className="text-sm text-slate-500">
              Your feedback helps us make better connections.
            </p>
            <Link
              href="/members"
              className="mt-5 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-600"
            >
              Back to Connect
            </Link>
          </>
        )}

        {state === "ready" && (
          <>
            <h1 className="mb-1 text-lg font-semibold text-brand-navy">
              How was your connection?
            </h1>
            <p className="mb-5 text-sm text-slate-500">
              With{" "}
              <span className="font-medium text-brand-navy">{otherName}</span>
            </p>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm text-slate-600">
                  Did you reach out?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReachedOut(true)}
                    className={pill(reachedOut === true)}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setReachedOut(false)}
                    className={pill(reachedOut === false)}
                  >
                    Not yet
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-600">
                  Was the connection useful?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setUseful("yes")}
                    className={pill(useful === "yes")}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setUseful("not_yet")}
                    className={pill(useful === "not_yet")}
                  >
                    Not yet
                  </button>
                  <button
                    onClick={() => setUseful("no")}
                    className={pill(useful === "no")}
                  >
                    No
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-600">
                  How relevant was the match? (optional)
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setScore(n)}
                      className={pill(score === n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-600">
                  Anything to add? (optional)
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                  placeholder="Optional"
                />
              </div>

              <button
                onClick={submit}
                disabled={saving}
                className="w-full rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600 disabled:opacity-50"
              >
                {saving ? "Submitting…" : "Submit feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-brand-yellow-50">
          <p className="text-sm text-slate-500">Loading…</p>
        </main>
      }
    >
      <FeedbackInner />
    </Suspense>
  );
}
