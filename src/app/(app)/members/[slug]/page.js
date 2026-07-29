"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Trash2,
  Mail,
} from "lucide-react";
import Button from "@/app/components/ui/Button";
import {
  getMember,
  getMyProfile,
  deleteAccount,
} from "@/app/lib/profileService";
import { logout } from "@/app/lib/logout";
import { memberNumberFromSlug } from "@/app/lib/slug";
import { useProfileStatus } from "@/app/store/profileStatusStore";
import LockedTeaser from "@/app/components/app/LockedTeaser";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAdmin = searchParams.get("from") === "admin";
  const { notify } = useNotificationStore();
  const isSearchable = useProfileStatus((s) => s.isSearchable);
  const myMemberNumber = useProfileStatus((s) => s.memberNumber);
  const [member, setMember] = useState(undefined);
  const [isMe, setIsMe] = useState(false);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    const num = memberNumberFromSlug(slug || "");
    if (!num) {
      setMember(null);
      return;
    }
    getMember(num)
      .then(setMember)
      .catch(() => setMember(null));
    // is this the logged-in user's own profile?
    getMyProfile()
      .then((me) => setIsMe(me?.user?.member_number === num))
      .catch(() => {});
  }, [slug]);

  async function handleDelete() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    try {
      await deleteAccount();
      notify("Your account has been deleted.", "success", 3000);
      await logout();
    } catch {
      notify("Couldn't delete your account. Please try again.", "error", 4000);
    }
  }

  if (member === undefined) {
    return (
      <>
        <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
      </>
    );
  }
  if (member === null) {
    return (
      <>
        <div className="py-16 text-center">
          <p className="text-sm text-slate-500">Member not found.</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-sm text-brand-blue"
          >
            Go back
          </button>
        </div>
      </>
    );
  }

  // Viewer must have completed their own MVP profile to view other members.
  // (Own profile is always viewable.)
  const viewingNum = memberNumberFromSlug(slug || "");
  const isOwn = myMemberNumber != null && viewingNum === myMemberNumber;
  if (!isSearchable && !isOwn) {
    return <LockedTeaser variant="block" />;
  }

  const waLink = member.whatsapp_number
    ? `https://wa.me/${member.whatsapp_number.replace(/[^\d]/g, "")}`
    : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() =>
            fromAdmin ? router.push("/admin/users") : router.back()
          }
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft size={14} />{" "}
          {fromAdmin ? "Back to members list" : "Back to members"}
        </button>
        {isMe && (
          <button
            onClick={() => router.push("/profile/edit")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-brand-blue hover:border-slate-300"
          >
            <Pencil size={13} /> Edit profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* left: identity + contact */}
        <div className="md:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-xl font-medium text-white">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt={member.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(member.full_name)
              )}
            </div>
            <h1 className="text-lg font-semibold text-brand-navy">
              {member.full_name}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {[member.title, member.business_name].filter(Boolean).join(" · ")}
            </p>
            {member.location && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                <MapPin size={12} /> {member.location}
              </p>
            )}

            {member.primary_link && (
              <a
                href={ensureUrl(member.primary_link)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-brand-blue hover:border-slate-300"
              >
                <LinkIcon size={14} /> {prettyLink(member.primary_link)}
              </a>
            )}

            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-brand-blue hover:border-slate-300"
              >
                <Mail size={14} /> {member.email}
              </a>
            )}

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block"
              >
                <Button>
                  <span className="flex items-center gap-2">
                    <MessageCircle size={16} /> Contact on WhatsApp
                  </span>
                </Button>
              </a>
            )}

            {!waLink && !member.email && !member.primary_link && (
              <p className="mt-4 text-xs text-slate-400">
                This member hasn&apos;t shared a contact channel.
              </p>
            )}

            <p className="mt-4 text-[11px] text-slate-400">
              Kuzana member #{member.member_number}
            </p>
          </div>
        </div>

        {/* right: details */}
        <div className="space-y-5 md:col-span-2">
          {member.intro && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm leading-relaxed text-slate-600">
                {member.intro}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {member.industries?.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 text-xs font-semibold text-slate-500">
                  Industry
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.industries.map((i) => (
                    <span
                      key={i.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                    >
                      {i.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Section title="Offers" items={member.offerings} tone="offer" />
            <Section
              title="Looking for"
              items={member.looking_for}
              tone="need"
            />
          </div>
        </div>
      </div>

      {isMe && (
        <div className="mt-8 border-t border-slate-200 pt-5 text-center">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-red"
          >
            <Trash2 size={13} /> Delete my account
          </button>
        </div>
      )}
    </>
  );
}

function Section({ title, items, tone }) {
  if (!items || items.length === 0) return null;
  const cls =
    tone === "offer"
      ? "bg-brand-blue-50 text-brand-blue-700"
      : "bg-slate-100 text-slate-600";
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-xs font-semibold text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span key={i} className={"rounded-full px-3 py-1 text-xs " + cls}>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}
function prettyLink(url = "") {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
// Members may enter a bare domain (example.com); without a protocol the browser
// treats it as relative and appends it to our own URL. Force an absolute URL.
function ensureUrl(url = "") {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
