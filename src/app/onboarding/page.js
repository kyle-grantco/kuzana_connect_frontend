"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import ChipInput from "@/app/components/ui/ChipInput";
import ProgressBar from "@/app/components/ui/ProgressBar";
import IndustryChips from "@/app/components/ui/IndustryChips";
import {
  getIndustries,
  saveMvpProfile,
  saveEnrichment,
  getMyProfile,
} from "@/app/lib/profileService";
import { slugify, ensureUrl } from "@/app/lib/slug";
import { loadDraft, saveDraft, clearDraft } from "@/app/lib/onboardingDraft";
import { useNotificationStore } from "@/app/store/notificationStore";
import { useProfileStatus } from "@/app/store/profileStatusStore";

// Card shell matching the auth/welcome screens (accent bar, border, shadow),
// but wider and left-aligned since this is a form.
function Card({ children }) {
  return (
    <div className="flex min-h-screen justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-1.5">
      <span className="block text-xs font-medium text-slate-600">
        {children}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const setProfileStatus = useProfileStatus((s) => s.setStatus);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(loadDraft());
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveDraft(form);
  }, [form]);
  useEffect(() => {
    getIndustries()
      .then(setIndustries)
      .catch(() => {});
  }, []);

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

  async function goToMyProfile() {
    try {
      const me = await getMyProfile();
      const n = me?.user?.member_number;
      const name = me?.user?.full_name || "";
      if (n) {
        router.replace(`/members/${slugify(name)}-${n}`);
        return;
      }
    } catch {}
    router.replace("/"); // fallback
  }

  function validateStep1() {
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

  async function submitMvp({ exit }) {
    const v = validateStep1();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await saveMvpProfile({
        title: form.title.trim(),
        business_name: form.business_name.trim() || null,
        intro: form.intro.trim() || null,
        location: form.location.trim(),
        industry_ids: form.industry_ids,
        offerings: form.offerings,
        looking_for: form.looking_for,
        contact_whatsapp: form.contact_whatsapp,
        contact_email: form.contact_email,
      });
      setProfileStatus({ isSearchable: true, completionStatus: "mvp" });
      if (exit) {
        clearDraft();
        notify("Profile saved.", "success", 3000);
        await goToMyProfile();
      } else {
        setStep(2);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Couldn't save. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    setError("");
    try {
      await saveEnrichment({
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
      });
      setProfileStatus({ isSearchable: true, completionStatus: "done" });
      clearDraft();
      notify("Profile complete!", "success", 3000);
      await goToMyProfile();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Couldn't save. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <ProgressBar percent={step === 1 ? 40 : 80} />

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">
              Let&apos;s get to know you
            </h1>
          </div>

          <Input
            label="Who are you?"
            value={form.title}
            onChange={update("title")}
            placeholder="e.g. Founder, HR Consultant, Investor"
            autoFocus
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
            <FieldLabel>Industry</FieldLabel>
            {industries.length === 0 ? (
              <p className="text-xs text-slate-400">Loading industries…</p>
            ) : (
              <IndustryChips
                industries={industries}
                selected={form.industry_ids}
                onToggle={toggleIndustry}
              />
            )}
          </div>

          <div>
            <FieldLabel hint="What you provide. e.g. accounting, bulk grain supply, web design">
              What do you offer?
            </FieldLabel>
            <ChipInput
              value={form.offerings}
              onChange={(v) => set("offerings", v)}
              placeholder="Add an offering and press +"
            />
          </div>

          <div>
            <FieldLabel hint="What you need. e.g. suppliers, investors, new clients">
              What are you looking for?
            </FieldLabel>
            <ChipInput
              value={form.looking_for}
              onChange={(v) => set("looking_for", v)}
              placeholder="Add a need and press +"
            />
          </div>

          <div>
            <FieldLabel>Short intro (optional)</FieldLabel>
            <textarea
              value={form.intro}
              onChange={update("intro")}
              rows={2}
              maxLength={400}
              placeholder="A sentence about you or your business"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
          </div>

          <div>
            <FieldLabel hint="You can change this anytime.">
              How can members reach you?
            </FieldLabel>
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

          <div className="pt-1">
            <Button
              onClick={() => submitMvp({ exit: false })}
              loading={loading}
            >
              <span className="flex items-center gap-2">
                Continue <ArrowRight size={16} />
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => submitMvp({ exit: true })}
              disabled={loading}
            >
              Save &amp; exit
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">
              Almost done
            </h1>
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

          {error && <p className="text-xs text-brand-red">{error}</p>}

          <div className="pt-1">
            <Button onClick={finish} loading={loading}>
              Finish
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <span className="flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
