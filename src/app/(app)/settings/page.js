"use client";

// Route: /settings
// Account-level settings (distinct from profile CONTENT, which is edited via
// "Edit profile"). Currently: email preferences + account deletion. Reached
// from the account menu.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import EmailPrefToggle from "@/app/components/app/EmailPrefToggle";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import { deleteAccount } from "@/app/lib/profileService";
import { logout } from "@/app/lib/logout";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function SettingsPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="mx-auto max-w-md md:max-w-xl">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-navy"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="mb-5 text-lg font-semibold text-brand-navy">Settings</h1>

      <div className="space-y-6">
        {/* Notifications / email preferences */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </h2>
          <EmailPrefToggle />
        </section>

        {/* Account */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Account
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-brand-navy">
              Delete account
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Permanently removes your profile. This can&apos;t be undone.
            </p>
            <button
              onClick={() => setDeleteOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-brand-red hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete my account
            </button>
          </div>
        </section>
      </div>

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
    </div>
  );
}
