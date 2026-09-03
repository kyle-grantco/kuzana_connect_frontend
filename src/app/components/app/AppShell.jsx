"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  User,
  UserPlus,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "@/app/store/authStore";
import { logout } from "@/app/lib/logout";
import { getMyProfile } from "@/app/lib/profileService";
import { slugify } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";
import NotificationBell from "@/app/components/app/NotificationBell";
import ConnectionQuota from "@/app/components/app/ConnectionQuota";

// Authed app shell: top bar (logo + notifications + account menu) + centered
// content area. Wrap the directory, profile view, etc. with this.
export default function AppShell({ children }) {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    getMyProfile()
      .then(setMe)
      .catch(() => {});
  }, []);

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
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
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
