"use client";

// In-app connection-feedback modal. Triggered from the feedback banner (see
// AppShell). Flow:
//   Step 1 (engaged?):  Yes / No
//     No  -> submit engaged=false -> thank-you ("we'll check back later")
//     Yes -> Step 2
//   Step 2 (score):     tap 1-5 (required) + optional note -> Submit
//                       (one button; empty note is the "skip")
//   Thank-you:          "Rate another connection?" -> parent loads the next one
//
// Dismiss (X) is its own flow: calls onDismiss (banner -> dismiss endpoint),
// never saves partial form data.

import { useState } from "react";
import { X } from "lucide-react";
import {
  submitConnectionFeedback,
  dismissConnectionFeedback,
} from "@/app/lib/connectionFeedbackService";

export default function ConnectionFeedbackModal({ person, onDone, onClose }) {
  // steps: "engaged" | "score" | "thanks"
  const [step, setStep] = useState("engaged");
  const [score, setScore] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const other = person?.user_id;
  const name = person?.full_name || "your connection";
  const first = name.split(" ")[0];

  async function answerEngaged(engaged) {
    if (engaged) {
      setStep("score");
      return;
    }
    // not engaged yet -> record, go to thanks (re-asked later)
    setSaving(true);
    try {
      const r = await submitConnectionFeedback({
        other_user_id: other,
        engaged: false,
      });
      setHasNext(!!r?.has_next);
    } catch {
      // best-effort; still show thanks
    } finally {
      setSaving(false);
      setStep("thanks");
    }
  }

  async function submitScore() {
    if (!score) return;
    setSaving(true);
    try {
      const r = await submitConnectionFeedback({
        other_user_id: other,
        engaged: true,
        score,
        note: note.trim() || null,
      });
      setHasNext(!!r?.has_next);
      setStep("thanks");
    } catch {
      setSaving(false);
    }
  }

  async function dismiss() {
    // dismiss flow: close the banner for this connection (its own endpoint),
    // never save partial form data.
    try {
      await dismissConnectionFeedback(other);
    } catch {
      // ignore
    }
    onClose?.();
  }

  const numBtn = (n) =>
    "h-11 w-11 rounded-lg border text-sm font-medium transition-colors " +
    (score === n
      ? "border-brand-blue bg-brand-blue text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={18} />
        </button>

        {step === "engaged" && (
          <>
            <h2 className="mb-1 pr-6 text-base font-semibold text-brand-navy">
              Your connection with {name}
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Did you reach out and engage with {first}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => answerEngaged(true)}
                disabled={saving}
                className="flex-1 rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600 disabled:opacity-50"
              >
                Yes, we connected
              </button>
              <button
                onClick={() => answerEngaged(false)}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
              >
                Not yet
              </button>
            </div>
          </>
        )}

        {step === "score" && (
          <>
            <h2 className="mb-1 pr-6 text-base font-semibold text-brand-navy">
              How was it?
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Rate your connection with {first}, 1 (not useful) to 5 (very
              useful).
            </p>
            <div className="mb-5 flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={numBtn(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Anything you'd like to share? (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. found a client, a partner, a supplier, an investor or a lead, or a productive conversation, or it wasn't relevant"
              className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
            <button
              onClick={submitScore}
              disabled={!score || saving}
              className="w-full rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600 disabled:opacity-40"
            >
              {saving ? "Submitting…" : "Submit"}
            </button>
          </>
        )}

        {step === "thanks" && (
          <>
            <h2 className="mb-1 text-base font-semibold text-brand-navy">
              Thank you
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              {hasNext
                ? "Want to rate another connection?"
                : "That's all for now."}
            </p>
            <div className="flex gap-2">
              {hasNext && (
                <button
                  onClick={() => onDone?.()}
                  className="flex-1 rounded-lg bg-brand-blue py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600"
                >
                  Rate another
                </button>
              )}
              <button
                onClick={() => onClose?.()}
                className={
                  "rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300 " +
                  (hasNext ? "flex-1" : "w-full")
                }
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
