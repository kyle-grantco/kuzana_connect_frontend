"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import PhotoUpload from "@/app/components/ui/PhotoUpload";
import ChipInput from "@/app/components/ui/ChipInput";
import IndustryChips from "@/app/components/ui/IndustryChips";
import {
  getMyProfile,
  getIndustries,
  updateProfile,
} from "@/app/lib/profileService";
import { slugify, ensureUrl } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";

// FastAPI returns validation errors as detail: [{ type, loc, msg, ... }] and
// other errors as detail: "string". Never render the raw object (React throws
// "Objects are not valid as a React child"); always resolve to a string.
function errorMessage(err, fallback = "Couldn't save. Please try again.") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (typeof err?.response?.data?.message === "string")
    return err.response.data.message;
  return fallback;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [form, setForm] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [memberNo, setMemberNo] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Armed once the user has been warned about having no contact method; a second
  // save then proceeds. Reset whenever they add a channel.
  const [contactWarned, setContactWarned] = useState(false);

  useEffect(() => {
    getIndustries()
      .then(setIndustries)
      .catch(() => {});
    getMyProfile()
      .then((me) => {
        const p = me.profile || {};
        setName(me.user?.full_name || "");
        setMemberNo(me.user?.member_number ?? null);
        setForm({
          title: p.title || "",
          business_name: p.business_name || "",
          intro: p.intro || "",
          traction: p.traction || "",
          location: p.location || "",
          industry_ids: (p.industries || []).map((i) => i.id),
          offerings: p.offerings || [],
          looking_for: p.looking_for || [],
          photo_url: p.photo_url || "",
          primary_link: p.primary_link || "",
          links: p.links || {},
          contact_whatsapp: p.contact_whatsapp ?? false,
          contact_email: p.contact_email ?? false,
        });
      })
      .catch(() => setError("Couldn't load your profile."));
  }, []);

  // When arriving via a deep link (e.g. /profile/edit#traction from a nudge
  // banner), scroll to and briefly focus the target section once the form has
  // loaded. The #hash alone can miss because the fields mount after fetch.
  useEffect(() => {
    if (!form) return;
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const field = el.querySelector("textarea, input");
      if (field) setTimeout(() => field.focus(), 350);
    }
  }, [form]);

  if (!form) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading…</p>;
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const update = (k) => (e) => set(k, e.target.value);
  function toggleIndustry(id) {
    set(
      "industry_ids",
      form.industry_ids.includes(id)
        ? form.industry_ids.filter((x) => x !== id)
        : [...form.industry_ids, id],
    );
  }

  // Reachable if any channel is set: a contact toggle OR a public link.
  const hasContact =
    !!form.contact_whatsapp ||
    !!form.contact_email ||
    !!(form.primary_link && form.primary_link.trim()) ||
    !!(form.links?.linkedin && form.links.linkedin.trim());

  // Toggling a contact channel on clears the warning (they've resolved it).
  function toggleContact(key) {
    const next = !form[key];
    set(key, next);
    if (next) setContactWarned(false);
  }

  function validate() {
    if (!form.title.trim()) return "Tell us who you are.";
    if (!form.location.trim()) return "Add your location.";
    if (form.industry_ids.length === 0) return "Pick at least one industry.";
    if (form.offerings.length === 0) return "Add at least one thing you offer.";
    if (form.looking_for.length === 0)
      return "Add at least one thing you're looking for.";
    return "";
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");

    // Contact nudge: if no channel at all and not yet warned, warn and stop.
    // A second save (still none) proceeds. Adding a channel clears it.
    if (!hasContact && !contactWarned) {
      setContactWarned(true);
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        title: form.title.trim(),
        business_name: form.business_name.trim() || null,
        intro: form.intro.trim() || null,
        traction: form.traction.trim() || null,
        location: form.location.trim(),
        industry_ids: form.industry_ids,
        offerings: form.offerings,
        looking_for: form.looking_for,
        photo_url: form.photo_url || null,
        primary_link: form.primary_link ? ensureUrl(form.primary_link) : null,
        links:
          form.links && Object.keys(form.links).length
            ? {
                ...form.links,
                ...(form.links.linkedin
                  ? { linkedin: ensureUrl(form.links.linkedin) }
                  : {}),
              }
            : null,
        contact_whatsapp: form.contact_whatsapp,
        contact_email: form.contact_email,
      });
      notify("Profile updated.", "success", 3000);
      // flag so the suggestions section briefly shows an "updating" note and
      // refetches once the background recompute finishes.
      try {
        sessionStorage.setItem("kc_profile_just_updated", "1");
      } catch {}
      if (memberNo) router.replace(`/members/${slugify(name)}-${memberNo}`);
      else router.replace("/members");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-5 text-lg font-semibold text-brand-navy">
          Edit your profile
        </h1>

        <div className="space-y-4">
          <div id="title" className="scroll-mt-24">
            <Input
              label="Who are you?"
              value={form.title}
              onChange={update("title")}
              placeholder="e.g. Founder, HR Consultant, Investor"
            />
          </div>
          <div id="business-name" className="scroll-mt-24">
            <Input
              label="Business name (optional)"
              value={form.business_name}
              onChange={update("business_name")}
              placeholder="Your business or company name"
            />
          </div>
          <div id="location" className="scroll-mt-24">
            <Input
              label="Location"
              value={form.location}
              onChange={update("location")}
              placeholder="City or town, e.g. Nairobi"
            />
          </div>

          <div id="industry" className="scroll-mt-24">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Industry
            </span>
            <IndustryChips
              industries={industries}
              selected={form.industry_ids}
              onToggle={toggleIndustry}
            />
          </div>

          <div id="offerings" className="scroll-mt-24">
            <span className="mb-0.5 block text-xs font-medium text-slate-600">
              What can you offer or help with?
            </span>
            <p className="mb-1.5 text-[11px] text-slate-400">
              What you do, or what you can help other members with. e.g. helping
              founders land their first customers, building websites for small
              businesses
            </p>
            <ChipInput
              value={form.offerings}
              onChange={(v) => set("offerings", v)}
              placeholder="Add one, then press +"
            />
          </div>

          <div id="looking-for" className="scroll-mt-24">
            <span className="mb-0.5 block text-xs font-medium text-slate-600">
              What are you looking for?
            </span>
            <p className="mb-1.5 text-[11px] text-slate-400">
              What you need or want help with. e.g. distribution partners, a
              technical co-founder, marketing support
            </p>
            <ChipInput
              value={form.looking_for}
              onChange={(v) => set("looking_for", v)}
              placeholder="Add one, then press +"
            />
          </div>

          <div id="intro" className="scroll-mt-24">
            <span className="mb-0.5 block text-xs font-medium text-slate-600">
              Short intro (optional)
            </span>
            <p className="mb-1.5 text-[11px] text-slate-400">
              A line or two about you and what you do.
            </p>
            <textarea
              value={form.intro}
              onChange={update("intro")}
              rows={4}
              maxLength={400}
              placeholder="e.g. I run a solar business installing systems for homes and small shops across central Kenya"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
          </div>

          <div id="traction" className="scroll-mt-24">
            <span className="mb-0.5 block text-xs font-medium text-slate-600">
              Traction (optional)
            </span>
            <p className="mb-1.5 text-[11px] text-slate-400">
              Where your business is at, whatever you're comfortable sharing:
              stage, revenue range, size, volume, key clients. It gives your
              matches useful context.
            </p>
            <textarea
              value={form.traction}
              onChange={update("traction")}
              rows={3}
              maxLength={300}
              placeholder="e.g. 2 years in, 100mt harvested annually, supplying 3 export partners"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
          </div>

          <div id="photo" className="scroll-mt-24">
            <PhotoUpload
              value={form.photo_url}
              onChange={(url) => set("photo_url", url)}
            />
          </div>
          <div id="primary-link" className="scroll-mt-24">
            <Input
              label="Primary link (optional)"
              value={form.primary_link}
              onChange={(e) => {
                set("primary_link", e.target.value);
                if (e.target.value.trim()) setContactWarned(false);
              }}
              placeholder="Your website or portfolio"
            />
          </div>
          <div id="linkedin" className="scroll-mt-24">
            <Input
              label="LinkedIn (optional)"
              value={form.links?.linkedin || ""}
              onChange={(e) => {
                set("links", { ...form.links, linkedin: e.target.value });
                if (e.target.value.trim()) setContactWarned(false);
              }}
              placeholder="Your LinkedIn profile link"
            />
          </div>

          <div id="contact" className="scroll-mt-24">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              How can members reach you?
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                ["contact_whatsapp", "WhatsApp"],
                ["contact_email", "Email"],
              ].map(([key, label]) => {
                const on = !!form[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleContact(key)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                      (on
                        ? "border-brand-yellow bg-brand-yellow-100 text-brand-navy font-medium"
                        : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-brand-red">{error}</p>}
          {contactWarned && !hasContact && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Info size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-amber-800">
                Members won&apos;t have a way to reach you. Add a contact method
                or a link above. Or tap Save again to continue anyway.
              </p>
            </div>
          )}

          <Button onClick={save} loading={loading}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
