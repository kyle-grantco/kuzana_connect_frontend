"use client";

// Owner-only invites panel on the profile. Create single-use invite links,
// see pending + joined invites, copy a link, cancel a pending one, and open a
// joined invitee's profile.
//
// The create form reuses VouchForm (relationship/remarks/year) with an invitee
// name field on top. On create, the share link is shown with a Copy button.
//
// Props:
//   selfMemberNumber - the owner's member number (for building profile links of
//                      joined invitees we use their member_number from the row)

import {
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  listMyInvites,
  adminListUserInvites,
  createInvite,
  cancelInvite,
  inviteLink,
} from "@/app/lib/inviteService";
import { LIMITS } from "@/app/lib/vouch";
import { useNotificationStore } from "@/app/store/notificationStore";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import VouchForm from "@/app/components/app/VouchForm";
import { engagementPeriod } from "@/app/lib/vouch";

const PAGE_SIZE = 10;

function fieldError(err, fallback) {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return fallback;
}

function InvitesSection({ userId = null, readOnly = false }, ref) {
  // userId set => admin viewing another member's invites (read-only).
  const adminView = !!userId;
  const isReadOnly = readOnly || adminView;
  const router = useRouter();
  const { notify } = useNotificationStore();

  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const sectionRef = useRef(null);

  // Let the parent (profile header "Invite" CTA) open the create form directly
  // and scroll here, instead of scrolling to the section and clicking again.
  useImperativeHandle(ref, () => ({
    openForm: () => {
      openForm();
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
  }));
  const [inviteeName, setInviteeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // freshly created invite -> show its share link
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  // cancel confirm
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = adminView
        ? await adminListUserInvites(userId, { page, page_size: PAGE_SIZE })
        : await listMyInvites({ page, page_size: PAGE_SIZE });
      setData({
        items: res.items || [],
        total: res.total || 0,
        page: res.page || page,
      });
    } catch {
      setData({ items: [], total: 0, page: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function openForm() {
    setInviteeName("");
    setFormError("");
    setCreated(null);
    setFormOpen(true);
  }

  async function submit(values) {
    if (!inviteeName.trim() || inviteeName.trim().length < 2) {
      setFormError("Enter the name of the person you're inviting.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await createInvite({
        invitee_name: inviteeName.trim(),
        ...values,
      });
      setCreated(res); // { id, token, invitee_name, status }
      setFormOpen(false);
      await load(1);
    } catch (err) {
      setFormError(fieldError(err, "Couldn't create the invite."));
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(token) {
    const link = inviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notify("Invite link copied.", "success", 2000);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Couldn't copy. Long-press the link to copy it.", "error", 3000);
    }
  }

  async function confirmCancel() {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await cancelInvite(toCancel.id);
      notify("Invite cancelled.", "success", 2500);
      setToCancel(null);
      await load(data.page);
    } catch (err) {
      notify(fieldError(err, "Couldn't cancel the invite."), "error", 3500);
    } finally {
      setCancelling(false);
    }
  }

  function openInviteeProfile(row) {
    // joined invites carry used_by_user_id; the row also includes the invitee's
    // member_number + name via the backend when joined (see note below).
    if (row.invitee_member_number) {
      const slug = (row.invitee_name || "member")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      router.push(`/members/${slug}-${row.invitee_member_number}`);
    }
  }

  return (
    <div
      ref={sectionRef}
      className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brand-navy">
          {isReadOnly ? "Invitations" : "Your invitations"}
        </h2>
        {!isReadOnly && !formOpen && (
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 rounded-lg border border-brand-blue/30 px-3 py-1.5 text-xs font-medium text-brand-blue hover:border-brand-blue hover:bg-brand-blue-50"
          >
            <Plus size={13} /> Invite someone
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-slate-400">
        {isReadOnly
          ? "People this member has invited, and the status of each."
          : "Bring in people you trust. Each invite is a single-use link tied to your vouch for that person."}
      </p>

      {/* freshly created -> share link */}
      {!isReadOnly && created && (
        <div className="mb-4 rounded-xl border border-brand-blue-100 bg-brand-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-blue-700">
              Invite ready for {created.invitee_name}
            </span>
            <button
              onClick={() => setCreated(null)}
              className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={inviteLink(created.token)}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            />
            <button
              onClick={() => copyLink(created.token)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-xs font-medium text-white hover:bg-brand-blue-600"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Share this link with {created.invitee_name} directly, e.g. on
            WhatsApp. It works once.
          </p>
        </div>
      )}

      {/* create form */}
      {!isReadOnly && formOpen && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-xs font-semibold text-slate-500">
            Invite someone
          </div>
          <VouchForm
            saving={saving}
            error={formError}
            submitLabel="Create invite"
            onSubmit={submit}
            onCancel={() => setFormOpen(false)}
            extraTop={
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Who are you inviting?
                </label>
                <input
                  value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)}
                  disabled={saving}
                  maxLength={LIMITS.name}
                  placeholder="Their name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
                />
              </div>
            }
          />
        </div>
      )}

      {/* list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          You haven&apos;t invited anyone yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((inv) => (
            <li
              key={inv.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              {/* top: name (loud) + status (right) */}
              <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
                <span className="truncate text-[15px] font-semibold text-brand-navy">
                  {inv.invitee_name}
                </span>
                <StatusPill status={inv.status} />
              </div>

              {/* metadata: relationship · period (quiet) */}
              <div className="px-4 pt-0.5 text-xs text-slate-400">
                {inv.relationship_type}
                {engagementPeriod(inv.engaged_from, inv.engaged_to)
                  ? ` · ${engagementPeriod(inv.engaged_from, inv.engaged_to)}`
                  : ""}
              </div>

              {/* vouch (readable, its own space) */}
              <p className="px-4 pb-3.5 pt-2 text-sm leading-relaxed text-slate-600">
                {inv.remarks}
              </p>

              {/* actions, set apart by a divider + subtle tint */}
              <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                {!isReadOnly && inv.status === "pending" && (
                  <>
                    <button
                      onClick={() => copyLink(inv.token)}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-600"
                    >
                      <Copy size={13} /> Copy link
                    </button>
                    <button
                      onClick={() => setToCancel(inv)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-red"
                    >
                      <X size={13} /> Cancel
                    </button>
                  </>
                )}
                {isReadOnly && inv.status === "pending" && (
                  <span className="text-xs text-slate-400">Pending</span>
                )}
                {isReadOnly && inv.status === "cancelled" && (
                  <span className="text-xs text-slate-400">Cancelled</span>
                )}
                {inv.status === "joined" &&
                  (inv.invitee_member_number ? (
                    <button
                      onClick={() => openInviteeProfile(inv)}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-600"
                    >
                      <ExternalLink size={13} /> View profile
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Joined</span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>
            Page {data.page} of {totalPages}
          </span>
          <button
            onClick={() => load(data.page - 1)}
            disabled={data.page <= 1 || loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            onClick={() => load(data.page + 1)}
            disabled={data.page >= totalPages || loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!toCancel}
        category="warning"
        title="Cancel this invite?"
        message={
          toCancel
            ? `The link for ${toCancel.invitee_name} will stop working. You can create a new invite anytime.`
            : ""
        }
        confirmLabel="Cancel invite"
        cancelLabel="Keep it"
        onConfirm={confirmCancel}
        onClose={() => setToCancel(null)}
        loading={cancelling}
      />
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: "bg-amber-50 text-amber-700",
    joined: "bg-green-50 text-green-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize " +
        (map[status] || "bg-slate-100 text-slate-500")
      }
    >
      {status}
    </span>
  );
}

export default forwardRef(InvitesSection);
