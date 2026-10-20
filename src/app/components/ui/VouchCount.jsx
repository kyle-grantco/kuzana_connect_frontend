"use client";

import Link from "next/link";
import { Handshake } from "lucide-react";
import { slugify } from "@/app/lib/slug";
import { useProfileStatus } from "@/app/store/profileStatusStore";

// Vouch count link to the member's vouches (#vouches on their profile).
// Always shown — vouches are the platform's trust currency, so 0 is an honest
// balance, not something to hide:
//   count > 0      -> bold yellow "N vouches"
//   0, others      -> muted "0 vouches" (lands on the "Vouch for this person" CTA)
//   0, own member  -> muted "0 vouches", with a blue "Invite people who know
//                     your work" CTA below (links to their own #invites-section)
// hideZero: render nothing at 0 (where there's no vouch form to land on, e.g.
// an incomplete profile, or "only if available" spots like notifications).
// linked={false}: plain text, for public pages where the viewer can't open
// profiles yet (invite landing). onClick: extra handler (e.g. close a menu).
// Stops propagation so it never triggers a parent card's click/Enter handler.
// Underline is always visible (no hover on mobile).
export default function VouchCount({
  count,
  member,
  size = "sm",
  hideZero = false,
  linked = true,
  onClick,
  className = "",
}) {
  const myNumber = useProfileStatus((s) => s.memberNumber);
  if (!member || (hideZero && !count)) return null;

  const isSelf = myNumber != null && myNumber === member.member_number;
  const sizes =
    size === "md" ? { text: "text-sm", icon: 16 } : { text: "text-xs", icon: 14 };

  const profilePath = `/members/${slugify(member.full_name)}-${member.member_number}`;
  const label = `${count || 0} ${count === 1 ? "vouch" : "vouches"}`;

  const tone = count
    ? "font-bold text-brand-yellow-600 hover:text-brand-yellow-700"
    : "font-normal text-slate-400 hover:text-slate-500";
  const base = `inline-flex w-fit items-center gap-1 ${tone} ${sizes.text}`;
  const icon = <Handshake size={sizes.icon} className="shrink-0" />;

  if (!linked) {
    return (
      <span className={`${base} ${className}`}>
        {icon}
        {label}
      </span>
    );
  }

  const stop = {
    onClick: (e) => {
      e.stopPropagation();
      onClick?.(e);
    },
    onKeyDown: (e) => e.stopPropagation(),
  };

  const countLink = (cls) => (
    <Link href={`${profilePath}#vouches`} {...stop} className={cls}>
      {icon}
      <span className="underline decoration-dotted underline-offset-2">{label}</span>
    </Link>
  );

  // Own zero: the owner is the one person who can act on it, so the count is
  // followed by a CTA to invite people who can vouch for them. Block wrapper
  // so each line follows the parent's text alignment (centred header, left
  // cards).
  if (!count && isSelf) {
    return (
      <div className={className}>
        <div>{countLink(base)}</div>
        <div className="mt-0.5">
          <Link
            href={`${profilePath}#invites-section`}
            {...stop}
            className={`font-medium text-brand-blue hover:text-brand-blue-600 ${sizes.text}`}
          >
            Invite people who know your work
          </Link>
        </div>
      </div>
    );
  }

  return countLink(`${base} ${className}`);
}
