"use client";

// Public trust section on a member profile. Shows endorsements in two
// directions via a toggle:
//   received -> people who have endorsed THIS member (person = endorser)
//   given    -> people THIS member has endorsed (person = endorsed)
//
// If the viewer is looking at someone else's profile and hasn't endorsed them,
// an "Endorse this person" action opens the form. The viewer's own endorsement
// (if any) shows with edit/delete. Names link to profiles.
//
// Props:
//   userId        - the profile owner's user id (endorsements are keyed by user id)
//   viewerIsOwner - true when the logged-in user owns this profile (hides the
//                   "endorse this person" action on your own profile)

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  listEndorsements,
  myEndorsementFor,
  createEndorsement,
  updateEndorsement,
  deleteEndorsement,
} from "@/app/lib/endorsementService";
import { slugify } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import VouchForm from "@/app/components/app/VouchForm";

const PAGE_SIZE = 10;

function fieldError(err, fallback) {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return fallback;
}

export default function EndorsementsSection({
  userId,
  viewerIsOwner,
  readOnly = false,
  receivedOnly = false,
}) {
  const router = useRouter();
  const { notify } = useNotificationStore();

  const [direction, setDirection] = useState("received");
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [loading, setLoading] = useState(true);

  // the viewer's own endorsement of this profile (only relevant on others')
  const [mine, setMine] = useState(null);
  const [mineLoaded, setMineLoaded] = useState(false);

  // form state: null = closed, {} = create, {..row} = edit
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // delete confirm
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (dir = direction, page = 1) => {
      setLoading(true);
      try {
        const res = await listEndorsements(userId, {
          direction: dir,
          page,
          page_size: PAGE_SIZE,
        });
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
    },
    [userId, direction],
  );

  useEffect(() => {
    load(direction, 1);
  }, [direction, load]);

  // load the viewer's own endorsement of this person (skip on own profile,
  // and skip entirely in read-only mode — no endorsing on an incomplete profile)
  useEffect(() => {
    if (viewerIsOwner || readOnly) {
      setMineLoaded(true);
      return;
    }
    myEndorsementFor(userId)
      .then((row) => setMine(row))
      .catch(() => setMine(null))
      .finally(() => setMineLoaded(true));
  }, [userId, viewerIsOwner]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  // Pin the viewer's own endorsement (can_edit) to the front on the received
  // list so they never miss it, then the rest, de-duplicated. On the "given"
  // list every row is theirs, so no pinning is applied.
  const orderedItems = (() => {
    if (readOnly || direction !== "received") return data.items;
    const own = data.items.filter((r) => r.can_edit);
    const rest = data.items.filter((r) => !r.can_edit);
    return [...own, ...rest];
  })();

  function openCreate() {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
  }
  function openEdit(row) {
    setEditing(row);
    setFormError("");
    setFormOpen(true);
  }

  async function submitForm(values) {
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateEndorsement(editing.id, values);
        notify("Endorsement updated.", "success", 2500);
      } else {
        await createEndorsement({ endorsed_user_id: userId, ...values });
        notify("Endorsement added.", "success", 2500);
      }
      setFormOpen(false);
      setEditing(null);
      // refresh both the list and the viewer's own-endorsement state
      await load(direction, direction === "received" ? 1 : data.page);
      if (!viewerIsOwner) {
        const row = await myEndorsementFor(userId).catch(() => null);
        setMine(row);
      }
    } catch (err) {
      setFormError(fieldError(err, "Couldn't save the endorsement."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteEndorsement(toDelete.id);
      notify("Endorsement removed.", "success", 2500);
      setToDelete(null);
      await load(direction, data.page);
      if (!viewerIsOwner) setMine(null);
    } catch {
      notify("Couldn't remove the endorsement.", "error", 3500);
    } finally {
      setDeleting(false);
    }
  }

  function goToProfile(person) {
    if (!person?.member_number) return;
    router.push(
      `/members/${slugify(person.full_name || "")}-${person.member_number}`,
    );
  }

  // Show the "Endorse this person" CTA only on someone else's profile, once
  // we've confirmed the viewer hasn't already endorsed them.
  const canEndorse = !readOnly && !viewerIsOwner && mineLoaded && !mine;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-navy">Endorsements</h2>

        {/* direction toggle (hidden when receivedOnly) */}
        {!receivedOnly && (
          <div className="flex gap-1 rounded-lg bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setDirection("received")}
              className={
                "rounded-md px-2.5 py-1 " +
                (direction === "received"
                  ? "bg-white font-medium text-brand-navy shadow-sm"
                  : "text-slate-500")
              }
            >
              Received
            </button>
            <button
              onClick={() => setDirection("given")}
              className={
                "rounded-md px-2.5 py-1 " +
                (direction === "given"
                  ? "bg-white font-medium text-brand-navy shadow-sm"
                  : "text-slate-500")
              }
            >
              Given
            </button>
          </div>
        )}
      </div>

      {/* endorse CTA */}
      {canEndorse && !formOpen && (
        <button
          onClick={openCreate}
          className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-blue/40 py-2.5 text-sm font-medium text-brand-blue hover:border-brand-blue hover:bg-brand-blue-50"
        >
          <Plus size={15} /> Endorse this person
        </button>
      )}

      {/* inline form */}
      {formOpen && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-xs font-semibold text-slate-500">
            {editing ? "Edit your endorsement" : "Endorse this person"}
          </div>
          <VouchForm
            initial={editing}
            saving={saving}
            error={formError}
            submitLabel={editing ? "Save changes" : "Add endorsement"}
            onSubmit={submitForm}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {/* list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {direction === "received"
            ? "No endorsements yet."
            : "Hasn't endorsed anyone yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orderedItems.map((row) => {
            const isOwn = row.can_edit;
            return (
              <li
                key={row.id}
                className={
                  "flex flex-col rounded-xl border p-4 " +
                  (isOwn && !readOnly
                    ? "border-brand-blue-100 bg-brand-blue-50"
                    : "border-slate-200 bg-white")
                }
              >
                {isOwn && !readOnly && (
                  <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-blue-700">
                    Your endorsement
                  </span>
                )}
                <VouchRow
                  row={row}
                  showPerson
                  onPersonClick={() => goToProfile(row.person)}
                />
                {!readOnly && row.can_edit && (
                  <div className="mt-3 flex gap-3 border-t border-brand-blue-100/60 pt-2.5">
                    <button
                      onClick={() => openEdit(row)}
                      className="flex items-center gap-1 text-[11px] text-brand-blue hover:text-brand-blue-600"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setToDelete(row)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-red"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* pagination (hidden until it overflows one page) */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>
            Page {data.page} of {totalPages}
          </span>
          <button
            onClick={() => load(direction, data.page - 1)}
            disabled={data.page <= 1 || loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            onClick={() => load(direction, data.page + 1)}
            disabled={data.page >= totalPages || loading}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-slate-300 disabled:opacity-40"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        category="danger"
        title="Remove this endorsement?"
        message="Your vouch for this person will be removed. You can endorse them again later."
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}

// One endorsement's content: relationship, remarks, year, and optionally the
// linked person (endorser or endorsed depending on the toggle).
function VouchRow({ row, showPerson, onPersonClick }) {
  return (
    <div>
      {showPerson && row.person && (
        <button
          onClick={onPersonClick}
          className="mb-1 flex items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-blue text-[11px] font-medium text-white">
            {row.person.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.person.photo_url}
                alt={row.person.full_name || ""}
                className="h-full w-full object-cover"
              />
            ) : (
              (row.person.full_name || "?").charAt(0).toUpperCase()
            )}
          </span>
          <span>
            <span className="block text-sm font-medium text-brand-navy hover:text-brand-blue">
              {row.person.full_name || "Member"}
            </span>
            {row.person.title && (
              <span className="block text-[11px] text-slate-400">
                {row.person.title}
              </span>
            )}
          </span>
        </button>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full bg-brand-yellow-100 px-2 py-0.5 text-brand-navy">
          {row.relationship_type}
        </span>
        {row.year_of_engagement && (
          <span className="text-slate-400">{row.year_of_engagement}</span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        {row.remarks}
      </p>
    </div>
  );
}
