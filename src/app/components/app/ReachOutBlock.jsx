"use client";

// Compact reach-out area on a CONNECTED member's profile.
//   - channel CTAs (WhatsApp / email) are the clear next step
//   - the suggested first message is ONE quiet line by default; click to expand
//     into a copyable box, collapses on click-outside
//   - LinkedIn is a plain gated link (not a reach-out channel)
//   - graceful line when the member has no WhatsApp/email
// The "Connected" status is a badge up by the name (rendered by the profile),
// not here, to keep this section light.

import { useState, useRef, useEffect } from "react";
import { Mail, Link as LinkIcon, Copy, Check } from "lucide-react";

function WhatsAppIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ReachOutBlock({
  member, // person being viewed
  contacts, // { whatsapp_number, email, linkedin }
  isMe,
  viewerName, // the logged-in member's own name (for message context)
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!expanded) return;
    function onOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target))
        setExpanded(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [expanded]);

  const wa = contacts?.whatsapp_number
    ? contacts.whatsapp_number.replace(/[^\d]/g, "")
    : null;
  const email = contacts?.email || null;
  const linkedin = contacts?.linkedin || null;
  const hasReach = !!(wa || email);

  const theirFirst = (member?.full_name || "there").split(" ")[0];
  const me = (viewerName || "").trim();
  const message = me
    ? `Hi ${theirFirst}, I'm ${me}. We connected on Kuzana Connect and I'd love to talk. Do you have a moment this week?`
    : `Hi ${theirFirst}, we connected on Kuzana Connect and I'd love to talk. Do you have a moment this week?`;

  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(message)}`
    : null;
  const mailHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(
        "Connecting via Kuzana Connect",
      )}&body=${encodeURIComponent(message)}`
    : null;

  async function copyMessage(e) {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  // Own profile: show your ACTUAL reachable channels (the values others see once
  // connected), so you know exactly how members can reach you. No reach-out
  // buttons — you don't message yourself.
  if (isMe) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-center text-[11px] text-slate-400">
          How connected members can reach you:
        </p>
        {contacts?.whatsapp_number && (
          <PlainRow icon={WhatsAppIcon} text={contacts.whatsapp_number} />
        )}
        {email && <PlainRow icon={Mail} text={email} />}
        {linkedin && <LinkedInRow url={linkedin} />}
        {!email && !contacts?.whatsapp_number && !linkedin && (
          <p className="text-xs text-slate-400">
            You haven&apos;t shared a contact channel.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {hasReach ? (
        <>
          <div className="space-y-2">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <div className="flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700">
                  <WhatsAppIcon size={15} /> Chat on WhatsApp
                </div>
              </a>
            )}
            {mailHref && (
              <a href={mailHref} className="block">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-brand-blue/30 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue-50">
                  <Mail size={15} /> Send email
                </div>
              </a>
            )}
            {email && (
              <div className="text-center text-[11px] text-slate-400">
                {email}
              </div>
            )}
          </div>

          {/* suggested first message: labelled box, tap to expand + copy */}
          <div
            ref={boxRef}
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Suggested first message
              </span>
              <button
                onClick={copyMessage}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-blue hover:text-brand-blue-600"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}{" "}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p
              onClick={() => setExpanded((v) => !v)}
              className="cursor-pointer text-[12px] leading-snug text-slate-600"
              style={
                expanded
                  ? undefined
                  : {
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }
              }
              title={
                expanded ? "Tap to collapse" : "Tap to read the full message"
              }
            >
              {message}
            </p>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] text-slate-400 hover:text-slate-500"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-400">
          {theirFirst} hasn&apos;t shared a contact method yet.
        </p>
      )}

      {linkedin && <LinkedInRow url={linkedin} className="mt-2" />}
    </div>
  );
}

function LinkedInRow({ url, className = "" }) {
  return (
    <a
      href={ensureUrl(url)}
      target="_blank"
      rel="noreferrer"
      className={
        "flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-brand-blue hover:border-slate-300 " +
        className
      }
    >
      <LinkIcon size={14} /> LinkedIn
    </a>
  );
}

function PlainRow({ icon: Icon, text }) {
  return (
    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-slate-500">
      <Icon size={14} /> {text}
    </div>
  );
}

function ensureUrl(url = "") {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
