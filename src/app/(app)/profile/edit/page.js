"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import ChipInput from "@/app/components/ui/ChipInput";
import IndustryChips from "@/app/components/ui/IndustryChips";
import {
  getMyProfile,
  getIndustries,
  updateProfile,
} from "@/app/lib/profileService";
import { slugify, ensureUrl } from "@/app/lib/slug";
import { useNotificationStore } from "@/app/store/notificationStore";

export default function EditProfilePage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const [form, setForm] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [memberNo, setMemberNo] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          location: p.location || "",
          industry_ids: (p.industries || []).map((i) => i.id),
          offerings: p.offerings || [],
          looking_for: p.looking_for || [],
          photo_url: p.photo_url || "",
          primary_link: p.primary_link || "",
          links: p.links || {},
          contact_whatsapp: p.contact_whatsapp ?? true,
          contact_email: p.contact_email ?? true,
        });
      })
      .catch(() => setError("Couldn't load your profile."));
  }, []);

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

  function validate() {
    if (!form.title.trim()) return "Tell us who you are.";
    if (!form.location.trim()) return "Add your location.";
    if (form.industry_ids.length === 0) return "Pick at least one industry.";
    if (form.offerings.length === 0) return "Add at least one thing you offer.";
    if (form.looking_for.length === 0)
      return "Add at least one thing you're looking for.";
    if (!form.contact_whatsapp && !form.contact_email)
      return "Choose at least one way for members to reach you.";
    return "";
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await updateProfile({
        title: form.title.trim(),
        business_name: form.business_name.trim() || null,
        intro: form.intro.trim() || null,
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
      if (memberNo) router.replace(`/members/${slugify(name)}-${memberNo}`);
      else router.replace("/");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Couldn't save. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
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
          <Input
            label="Who are you?"
            value={form.title}
            onChange={update("title")}
            placeholder="e.g. Founder, HR Consultant, Investor"
          />
          <Input
            label="Business name (optional)"
            value={form.business_name}
            onChange={update("business_name")}
            placeholder="Your business or company name"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={update("location")}
            placeholder="City or town, e.g. Nairobi"
          />

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Industry
            </span>
            <IndustryChips
              industries={industries}
              selected={form.industry_ids}
              onToggle={toggleIndustry}
            />
          </div>

          <div>
            <span className="mb-0.5 block text-xs font-medium text-slate-600">
              What do you offer?
            </span>
            <p className="mb-1.5 text-[11px] text-slate-400">
              The products or services you provide. e.g. bookkeeping, bulk maize
              supply, logo design
            </p>
            <ChipInput
              value={form.offerings}
              onChange={(v) => set("offerings", v)}
              placeholder="Add an offering and press +"
            />
          </div>

          <div>
            <span className="mb-0.5 block text-xs font-medium text-slate-600">
              What are you looking for?
            </span>
            <p className="mb-1.5 text-[11px] text-slate-400">
              Help, services or connections you need. e.g. a supplier, an
              accountant, new clients
            </p>
            <ChipInput
              value={form.looking_for}
              onChange={(v) => set("looking_for", v)}
              placeholder="Add a need and press +"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Short intro (optional)
            </span>
            <textarea
              value={form.intro}
              onChange={update("intro")}
              rows={2}
              maxLength={400}
              placeholder="A sentence about you or your business"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
          </div>

          <Input
            label="Photo URL (optional)"
            value={form.photo_url}
            onChange={update("photo_url")}
            placeholder="Link to a photo of you"
          />
          <Input
            label="Primary link (optional)"
            value={form.primary_link}
            onChange={update("primary_link")}
            placeholder="Your website or portfolio"
          />
          <Input
            label="LinkedIn (optional)"
            value={form.links?.linkedin || ""}
            onChange={(e) =>
              set("links", { ...form.links, linkedin: e.target.value })
            }
            placeholder="Your LinkedIn profile link"
          />

          <div>
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
                    onClick={() => set(key, !on)}
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

          <Button onClick={save} loading={loading}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
