"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  User,
  UserPlus,
  Settings,
  LogOut,
  LayoutDashboard,
  Handshake,
} from "lucide-react";
import { useAuthStore } from "@/app/store/authStore";
import { logout } from "@/app/lib/logout";
import { getMyProfile } from "@/app/lib/profileService";
import { slugify } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";
import { useProfileStatus } from "@/app/store/profileStatusStore";
import NotificationBell from "@/app/components/app/NotificationBell";
import ConnectionQuota from "@/app/components/app/ConnectionQuota";
import Banner, { isBannerDismissed } from "@/app/components/ui/Banner";
import ConnectionFeedbackModal from "@/app/components/app/ConnectionFeedbackModal";
import { getNextFeedback } from "@/app/lib/connectionFeedbackService";

// Authed app shell: top bar (logo + notifications + account menu) + centered
// content area. Wrap the directory, profile view, etc. with this.
//
// Also hosts app-wide comms banners (profile nudges, announcements). The
// traction nudge shows when the member's profile has no traction yet; the
// condition comes from the profile store (set by the (app) guard layout), so
// no extra fetch is needed here. Banners are dismissible per session and
// reappear on next login until the member acts.
const BANNER_IDS = [
  "vouch-back",
  "get-vouched",
  "connection-feedback",
  "add-traction",
];

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { notify } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(null);
  const menuRef = useRef(null);

  const profileLoaded = useProfileStatus((s) => s.loaded);
  const hasTraction = useProfileStatus((s) => s.hasTraction);
  const isSearchable = useProfileStatus((s) => s.isSearchable);
  const vouchCount = useProfileStatus((s) => s.vouchCount);
  const myNumber = useProfileStatus((s) => s.memberNumber);
  const myName = useProfileStatus((s) => s.fullName);
  const vouchBack = useProfileStatus((s) => s.vouchBack);
  const invitedRecently = useProfileStatus((s) => s.invitedRecently);
  const setStatus = useProfileStatus((s) => s.setStatus);

  // in-app connection feedback: the next connection to ask about (or null),
  // plus whether the modal is open. fbLoaded: the first fetch has settled, so
  // the banner slot doesn't show a lower banner and then swap it out.
  const [fbPerson, setFbPerson] = useState(null);
  const [fbOpen, setFbOpen] = useState(false);
  const [fbLoaded, setFbLoaded] = useState(false);

  // Banner ids dismissed this login. AppShell only mounts client-side (after
  // the (app) guard), so reading storage in the initializer is safe and the
  // slot never flashes a dismissed banner.
  const [dismissed, setDismissed] = useState(
    () => new Set(BANNER_IDS.filter(isBannerDismissed)),
  );
  const markDismissed = (id) => setDismissed((d) => new Set(d).add(id));

  async function loadNextFeedback() {
    try {
      const r = await getNextFeedback();
      setFbPerson(r?.pending ? r.person : null);
    } catch {
      setFbPerson(null);
    } finally {
      setFbLoaded(true);
    }
  }

  // Re-read own profile on every in-app navigation (the shell stays mounted
  // across pages), so profile-driven banners (vouches, vouch-back, traction)
  // reflect the current state, e.g. hide once someone has vouched for you.
  // (Feedback is re-checked by its own effect below, also on navigation.)
  useEffect(() => {
    getMyProfile()
      .then((m) => {
        setMe(m);
        const p = m?.profile;
        setStatus({
          hasTraction: !!(p?.traction && String(p.traction).trim()),
          vouchCount: m?.vouch_count ?? null,
          vouchBack: m?.vouch_back ?? null,
          invitedRecently: !!m?.invited_recently,
        });
      })
      .catch(() => {});
  }, [pathname, setStatus]);

  useEffect(() => {
    // only ask members with a usable profile (searchable)
    // re-checked on every in-app navigation too; the endpoint is read-only
    if (profileLoaded && isSearchable) loadNextFeedback();
  }, [profileLoaded, isSearchable, pathname]);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const name = me?.user?.full_name || "";
  const memberNo = me?.user?.member_number;

  // App-wide comms banners share one slot. Priority order:
  // vouch-back (vouch for your inviter) > vouches (no one has vouched for
  // you) > connection feedback > traction.
  // The first eligible, non-dismissed one shows; dismissing falls through to
  // the next. Nothing renders until everything it depends on has loaded.
  const slotReady = profileLoaded && (fbLoaded || !isSearchable);
  const vouchBackFirst = (vouchBack?.full_name || "them").split(" ")[0];
  const banners = [
    {
      // invited members who haven't vouched for their inviter yet. Highest:
      // a one-tap action that grows trust for someone they already know.
      id: "vouch-back",
      show: isSearchable && !!vouchBack?.member_number,
      props: {
        type: "important",
        icon: Handshake,
        message: `${vouchBack?.full_name} invited you to the network. Vouch for them so other members know they can trust them. It takes a minute.`,
        ctaLabel: `Vouch for ${vouchBackFirst}`,
        ctaHref: `/members/${slugify(vouchBack?.full_name || "")}-${vouchBack?.member_number}#vouches`,
      },
    },
    {
      id: "get-vouched",
      // snoozed for 7 days after they invite someone (the action it asks for)
      show:
        isSearchable && vouchCount === 0 && myNumber != null && !invitedRecently,
      props: {
        type: "important",
        icon: Handshake,
        message:
          "You don't have any vouches yet. Vouches are how you're trusted in the network, and members with vouches stand out. Invite people who know your work so they can vouch for you.",
        ctaLabel: "Invite people who can vouch for you",
        ctaHref: `/members/${slugify(myName || "")}-${myNumber}#invites-section`,
      },
    },
    {
      id: "connection-feedback",
      show: !!fbPerson,
      props: {
        type: "update",
        message: `You connected with ${fbPerson?.full_name}. How did it go?`,
        ctaLabel: "Rate this connection",
        onCta: () => setFbOpen(true),
      },
    },
    {
      id: "add-traction",
      show: isSearchable && !hasTraction,
      props: {
        type: "update",
        message:
          "New: add your traction, where your business is at. It gives your matches useful context.",
        ctaLabel: "Add it",
        ctaHref: "/profile/edit#traction",
      },
    },
  ];
  const activeBanner = slotReady
    ? banners.find((b) => b.show && !dismissed.has(b.id))
    : null;

  function goToMyProfile() {
    setOpen(false);
    if (memberNo) router.push(`/members/${slugify(name)}-${memberNo}`);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/members")}
            className="flex items-center gap-2"
            aria-label="Kuzana Connect home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kuzana-logo.png"
              alt="Kuzana"
              className="h-8 w-auto object-contain"
            />
            <span className="text-sm font-semibold text-brand-navy">
              Kuzana Connect
            </span>
          </button>

          {/* right side: notifications + account */}
          <div className="flex items-center gap-3">
            <ConnectionQuota />
            <NotificationBell />

            {/* account menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 hover:border-slate-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-[11px] font-medium text-white">
                  {initials(name)}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {name && (
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="text-sm font-medium text-brand-navy">
                        {name}
                      </div>
                      {memberNo != null && (
                        <div className="text-[11px] text-slate-400">
                          Member #{memberNo}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={goToMyProfile}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <User size={15} /> My profile
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push("/connections/requests");
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <UserPlus size={15} /> Connection requests
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Settings size={15} /> Settings
                  </button>
                  {(me?.user?.role === "admin" ||
                    me?.user?.role === "super_admin") && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push("/admin");
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <LayoutDashboard size={15} /> Admin dashboard
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* App-wide comms banners: one prioritized slot (see `banners`). */}
        {activeBanner && (
          <Banner
            key={activeBanner.id}
            id={activeBanner.id}
            {...activeBanner.props}
            onDismiss={() => markDismissed(activeBanner.id)}
          />
        )}

        {fbOpen && fbPerson && (
          <ConnectionFeedbackModal
            key={fbPerson.user_id}
            person={fbPerson}
            onDone={(next) => {
              // "rate the next person": the submit response already named
              // them, so the modal remounts for them (key change resets its
              // steps); with no next person it closes.
              if (next) {
                setFbPerson(next);
              } else {
                setFbPerson(null);
                setFbOpen(false);
              }
            }}
            onClose={async () => {
              setFbOpen(false);
              // a dismiss/submit may have changed the next target
              await loadNextFeedback();
            }}
          />
        )}

        <div className="mt-4 first:mt-0">{children}</div>
      </main>
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
