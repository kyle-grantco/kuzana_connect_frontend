"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Trash2,
  Mail,
  UserPlus,
  UserCheck,
  Clock,
  Check,
} from "lucide-react";
import Button from "@/app/components/ui/Button";
import {
  getMember,
  getMyProfile,
  deleteAccount,
} from "@/app/lib/profileService";
import { invitedBy } from "@/app/lib/inviteService";
import ConnectRequestModal from "@/app/components/app/ConnectRequestModal";
import ReachOutBlock from "@/app/components/app/ReachOutBlock";
import { logout } from "@/app/lib/logout";
import { memberNumberFromSlug, slugify } from "@/app/lib/slug";
import { useProfileStatus } from "@/app/store/profileStatusStore";
import LockedTeaser from "@/app/components/app/LockedTeaser";
import EndorsementsSection from "@/app/components/app/EndorsementsSection";
import InvitesSection from "@/app/components/app/InvitesSection";
import SuggestionsSections from "@/app/components/app/SuggestionsSections";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAdmin = searchParams.get("from") === "admin";
  const fromOnboarding = searchParams.get("from") === "onboarding";

  function goBackToMembers() {
    if (fromAdmin) {
      router.push("/admin/users");
      return;
    }
    if (fromOnboarding) {
      router.push("/members");
      return;
    } // no useful history after onboarding
    router.push("/members"); // normal browse — preserves directory scroll
  }
  const { notify } = useNotificationStore();
  const isSearchable = useProfileStatus((s) => s.isSearchable);
  const myMemberNumber = useProfileStatus((s) => s.memberNumber);
  const [member, setMember] = useState(undefined);
  const [isMe, setIsMe] = useState(false);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [viewerName, setViewerName] = useState("");
  const [inviter, setInviter] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const invitesRef = useRef(null);

  // Contact gating: contacts (whatsapp/email/linkedin) are hidden until the
  // viewer connects. is_connected + the channel-existence flags come from the
  // member fetch; on connect we get the actual contact values back.
  const [connected, setConnected] = useState(false);
  const [contacts, setContacts] = useState({
    whatsapp_number: null,
    email: null,
    linkedin: null,
  });
  const [connectOpen, setConnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    const num = memberNumberFromSlug(slug || "");
    if (!num) {
      setMember(null);
      return;
    }
    getMember(num)
      .then((m) => {
        setMember(m);
        setConnected(!!m?.is_connected);
        // when already connected (or own profile), the fetch includes contacts
        if (m?.is_connected || m?.is_self) {
          setContacts({
            whatsapp_number: m.whatsapp_number || null,
            email: m.email || null,
            linkedin: m.linkedin || null,
          });
        }
        // who invited this member (permanent trust fact). Needs the owner's
        // user_id; the member endpoint exposes it as member.user_id.
        if (m?.user_id) {
          invitedBy(m.user_id)
            .then(setInviter)
            .catch(() => setInviter(null));
        }
      })
      .catch(() => setMember(null));
    // is this the logged-in user's own profile?
    getMyProfile()
      .then((me) => {
        setIsMe(me?.user?.member_number === num);
        setViewerName(me?.user?.full_name || "");
        const role = me?.user?.role;
        setViewerIsAdmin(role === "admin" || role === "super_admin");
      })
      .catch(() => {});
  }, [slug]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      notify("Your account has been deleted.", "success", 3000);
      await logout();
    } catch {
      notify("Couldn't delete your account. Please try again.", "error", 4000);
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // Connect now opens the request composer. Contacts are revealed only after
  // the recipient accepts (handled server-side; this page reflects it on reload).

  if (member === undefined) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }
  if (member === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">Member not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-sm text-brand-blue"
        >
          Go back
        </button>
      </div>
    );
  }

  // Viewer must have completed their own MVP profile to view other members.
  // (Own profile is always viewable.)
  const viewingNum = memberNumberFromSlug(slug || "");
  const isOwn = myMemberNumber != null && viewingNum === myMemberNumber;
  if (!isSearchable && !isOwn) {
    return <LockedTeaser variant="block" />;
  }

  // Member has joined but hasn't set up a profile yet (active, not searchable).
  // Show identity + who invited them + endorsements they've received (which, for
  // a just-joined member, is the seeded vouch from their inviter). Nothing else:
  // no offers/needs, no contact, no endorse action, no invites.
  if (member.profile_complete === false) {
    return (
      <>
        <div className="mb-4">
          <button
            onClick={goBackToMembers}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-brand-blue text-xl font-medium text-white">
              {initials(member.full_name)}
            </div>
            <h1 className="text-lg font-semibold text-brand-navy">
              {member.full_name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              This member hasn&apos;t set up their profile yet.
            </p>
            <p className="mt-4 text-[11px] text-slate-400">
              Kuzana member #{member.member_number}
            </p>
            {inviter && (
              <p className="mt-1 text-[11px] text-slate-400">
                Invited by{" "}
                <button
                  onClick={() =>
                    inviter.member_number &&
                    router.push(
                      `/members/${slugify(inviter.full_name || "")}-${inviter.member_number}`,
                    )
                  }
                  className="text-brand-blue hover:text-brand-blue-600"
                >
                  {inviter.full_name}
                </button>
              </p>
            )}
          </div>

          {/* Endorsements received — read-only. For a just-joined member this is
              the seeded vouch from their inviter. */}
          {member.user_id && (
            <div className="mt-5">
              <EndorsementsSection
                userId={member.user_id}
                viewerIsOwner={isMe}
                readOnly
                receivedOnly
              />
            </div>
          )}

          {/* Admin: who this (incomplete) member has invited */}
          {!isMe && viewerIsAdmin && member.user_id && (
            <div className="mt-5">
              <InvitesSection userId={member.user_id} readOnly />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goBackToMembers}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft size={14} /> Back
        </button>
        {isMe && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => invitesRef.current?.openForm()}
              className="flex items-center gap-1.5 rounded-lg border border-brand-blue/30 px-3 py-1.5 text-xs font-medium text-brand-blue hover:border-brand-blue hover:bg-brand-blue-50"
            >
              <UserPlus size={13} /> Invite
            </button>
            <button
              onClick={() => router.push("/profile/edit")}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-brand-blue hover:border-slate-300"
            >
              <Pencil size={13} /> Edit profile
            </button>
          </div>
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
            {connected && !isMe && !member.is_self && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                <Check size={11} /> Connected
              </span>
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

            {/* Contact channels are gated behind a connection. primary_link
                above stays public; whatsapp/email/linkedin appear only once
                connected (or on your own profile). */}
            {(() => {
              const hasAnyChannel =
                member.has_whatsapp || member.has_email || member.has_linkedin;

              // Own profile or already connected -> reach-out block.
              const ownProfile = isMe || member.is_self;
              if (ownProfile || connected) {
                return (
                  <ReachOutBlock
                    member={member}
                    contacts={contacts}
                    isMe={ownProfile}
                    viewerName={viewerName}
                  />
                );
              }

              // Not connected. If a request is already pending, show a
              // disabled state and never open the compose form again.
              if (member.request_status === "pending") {
                return (
                  <div className="mt-4">
                    <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-400">
                      <Clock size={15} /> Request pending
                    </div>
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      Waiting for {member.full_name?.split(" ")[0]} to respond.
                    </p>
                  </div>
                );
              }
              // Otherwise show Connect. (Accept-time handles the case where the
              // recipient has no contact channel — we don't block connecting.)
              return (
                <div className="mt-4">
                  <Button onClick={() => setConnectOpen(true)}>
                    <span className="flex items-center gap-2">
                      <UserCheck size={16} /> Connect
                    </span>
                  </Button>
                </div>
              );
            })()}

            <p className="mt-4 text-[11px] text-slate-400">
              Kuzana member #{member.member_number}
            </p>

            {/* Invited by — permanent trust fact; only shows if one exists. */}
            {inviter && (
              <p className="mt-1 text-[11px] text-slate-400">
                Invited by{" "}
                <button
                  onClick={() =>
                    inviter.member_number &&
                    router.push(
                      `/members/${slugify(inviter.full_name || "")}-${inviter.member_number}`,
                    )
                  }
                  className="text-brand-blue hover:text-brand-blue-600"
                >
                  {inviter.full_name}
                </button>
              </p>
            )}
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

      {/* Suggestions — own profile only. Placed right after profile info so a
          member sees who to connect with the moment they finish/edit (the aha
          moment), before endorsements/invites. Reuses the directory component in
          compact mode. */}
      {isMe && (
        <div className="mt-5">
          <SuggestionsSections compact />
        </div>
      )}

      {/* Admin viewing another member: their suggestions (match-quality debug).
          Shows the full unfiltered result the engine produced for this member. */}
      {!isMe && viewerIsAdmin && member.user_id && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-yellow-text">
            Member suggestions (admin view)
          </div>
          <SuggestionsSections userId={member.user_id} admin compact />
        </div>
      )}

      {/* Endorsements — trust signal, after knowing what the member does.
          Needs the owner's user_id (member.user_id). */}
      {member.user_id && (
        <div className="mt-5">
          <EndorsementsSection userId={member.user_id} viewerIsOwner={isMe} />
        </div>
      )}

      {/* Invites — owner-only, last. Bringing in trusted people. */}
      {isMe && (
        <div id="invites-section" className="mt-5 scroll-mt-20">
          <InvitesSection ref={invitesRef} />
        </div>
      )}

      {/* Admin viewing another member: read-only view of who they invited */}
      {!isMe && viewerIsAdmin && member.user_id && (
        <div className="mt-5">
          <InvitesSection userId={member.user_id} readOnly />
        </div>
      )}

      {isMe && (
        <div className="mt-8 border-t border-slate-200 pt-5 text-center">
          <div className="mb-3 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/terms" className="hover:text-brand-navy">
              Terms
            </Link>
            <span className="text-slate-300">·</span>
            <Link href="/privacy" className="hover:text-brand-navy">
              Privacy Policy
            </Link>
          </div>
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-red"
          >
            <Trash2 size={13} /> Delete my account
          </button>
        </div>
      )}

      <ConnectRequestModal
        open={connectOpen}
        member={member}
        onClose={() => setConnectOpen(false)}
        onSent={() =>
          setMember((m) => (m ? { ...m, request_status: "pending" } : m))
        }
      />

      <ConfirmModal
        open={deleteOpen}
        category="danger"
        title="Delete your account?"
        message="This permanently removes your profile and can't be undone."
        confirmLabel="Delete account"
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
        loading={deleting}
      />
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
