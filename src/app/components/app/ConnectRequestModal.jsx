"use client";

// Compose + send a connection request (double opt-in). Opens from a member's
// profile Connect button. Pre-fills a short intro (editable). On success the
// request is sent and the recipient is notified; contacts are NOT revealed until
// they accept.

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import {
  sendConnectionRequest,
  getRequestQuota,
} from "@/app/lib/connectionRequestService";
import { useNotificationStore } from "@/app/store/notificationStore";

const MAX = 500;

export default function ConnectRequestModal({
  open,
  member, // { user_id, full_name, ... }
  prefill = "", // suggested intro (from the match reason, optional)
  onClose,
  onSent, // called after a successful send
}) {
  const { notify } = useNotificationStore();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    if (!open) return;
    setMessage(prefill || "");
    getRequestQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, [open, prefill]);

  if (!open || !member) return null;

  const remaining = quota?.remaining;
  const noneLeft = remaining === 0;

  async function submit() {
    const msg = message.trim();
    if (!msg) {
      notify("Please add a short message.", "error", 3000);
      return;
    }
    setSending(true);
    try {
      await sendConnectionRequest(member.user_id, msg);
      notify(
        `Request sent to ${member.full_name}. You'll be notified when they respond.`,
        "success",
        3500,
      );
      onSent?.();
      onClose();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        "Couldn't send your request. Please try again.";
      notify(detail, "error", 4000);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-brand-navy">
              Connect with {member.full_name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Send a short note with your request.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
          rows={4}
          placeholder="Say hello and why you'd like to connect…"
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {remaining != null &&
              `${remaining} request${remaining === 1 ? "" : "s"} left today`}
          </span>
          <span>
            {message.length}/{MAX}
          </span>
        </div>

        <button
          onClick={submit}
          disabled={sending || noneLeft}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-medium text-white hover:bg-brand-blue-600 disabled:opacity-50"
        >
          <Send size={15} />
          {noneLeft
            ? "You can send one request a day"
            : sending
              ? "Sending…"
              : "Send request"}
        </button>
      </div>
    </div>
  );
}
