"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import Input from "@/app/components/ui/Input";
import Button from "@/app/components/ui/Button";
import PhotoUpload from "@/app/components/ui/PhotoUpload";
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
import {
  loadDraft,
  saveDraft,
  clearDraft,
  EMPTY,
} from "@/app/lib/onboardingDraft";
import { useNotificationStore } from "@/app/store/notificationStore";
import { useProfileStatus } from "@/app/store/profileStatusStore";

function Card({ children }) {
  return (
    <div className="flex min-h-screen justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md md:max-w-xl">
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

// FastAPI returns validation errors as detail: [{ type, loc, msg, ... }], and
// other errors as detail: "string". Never render the raw object (React throws
// "Objects are not valid as a React child"); always resolve to a string.
function errorMessage(err, fallback = "Couldn't save. Please try again.") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.msg) return first.msg;
  }
  if (typeof err?.response?.data?.message === "string")
    return err.response.data.message;
  return fallback;
}

// Amber "heads-up" notice — distinct from red errors (which mean "you did
// something wrong"). This is a nudge for a valid-but-worth-flagging choice.
function ContactNotice({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <Info size={15} className="mt-0.5 shrink-0 text-amber-500" />
      <p className="text-xs leading-relaxed text-amber-800">{children}</p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { notify } = useNotificationStore();
  const setProfileStatus = useProfileStatus((s) => s.setStatus);

  const [step, setStep] = useState(1);
  // Start from a stable default so server and client render identically. The
  // saved draft lives in localStorage (client-only); loading it during initial
  // state would make the first client render differ from the server HTML and
  // break hydration. So load it in an effect after mount instead.
  const [form, setForm] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // "armed" once the user has been warned about having no contact method; a
  // second action then proceeds. Reset whenever they add a channel.
  const [contactWarned, setContactWarned] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await getMyProfile();
        const status = me?.profile?.completion_status;
        const n = me?.user?.member_number;
        if (active && (status === "mvp" || status === "done") && n != null) {
          router.replace("/members");
        }
      } catch {
        // check failed — let them proceed with onboarding
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  // After mount (client only), merge any saved draft over the default.
  useEffect(() => {
    const draft = loadDraft();
    if (draft) setForm((f) => ({ ...f, ...draft }));
    setHydrated(true);
  }, []);

  // Persist edits, but only after hydration so we don't overwrite the stored
  // draft with the empty default on first render.
  useEffect(() => {
    if (hydrated) saveDraft(form);
  }, [form, hydrated]);
  useEffect(() => {
    getIndustries()
      .then(setIndustries)
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const update = (k) => (e) => set(k, e.target.value);

  // A member is "reachable" if any channel is set. On step 1 only the toggles
  // exist; on step 2 a link (primary or LinkedIn) also counts.
  const hasStep1Contact = !!form.contact_whatsapp || !!form.contact_email;
  const hasAnyContact =
    hasStep1Contact ||
    !!(form.primary_link && form.primary_link.trim()) ||
    !!(form.links?.linkedin && form.links.linkedin.trim());

  function toggleIndustry(id) {
    set(
      "industry_ids",
      form.industry_ids.includes(id)
        ? form.industry_ids.filter((x) => x !== id)
        : [...form.industry_ids, id],
    );
  }

  // Toggling a contact channel clears the warning (they've resolved it).
  function toggleContact(key) {
    const next = !form[key];
    set(key, next);
    if (next) setContactWarned(false);
  }

  function goToMainPage() {
    // Land new members on the main page (their suggestions) after onboarding,
    // not their own profile.
    router.replace("/members?from=onboarding");
  }

  // Hard validations only (these block). Contact is handled separately as a
  // warn-once nudge, not a hard block.
  function validateStep1() {
    if (!form.title.trim()) return "Tell us who you are.";
    if (!form.location.trim()) return "Add your location.";
    if (form.industry_ids.length === 0) return "Pick at least one industry.";
    if (form.offerings.length === 0) return "Add at least one thing you offer.";
    if (form.looking_for.length === 0)
      return "Add at least one thing you're looking for.";
    return "";
  }

  async function submitMvp({ exit }) {
    const v = validateStep1();
    if (v) {
      setError(v);
      return;
    }
    setError("");

    // Contact nudge: if no channel chosen and not yet warned, warn and stop.
    // A second click (still no channel) proceeds. Adding a channel clears it.
    if (!hasStep1Contact && !contactWarned) {
      setError(""); // don't stack a red error under the amber nudge
      setContactWarned(true);
      return;
    }

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
        await goToMainPage();
      } else {
        setContactWarned(false); // reset for step 2's own check
        setStep(2);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setError("");

    // Final contact nudge: if there's no channel at all (no toggles AND no
    // links), warn once, then allow finishing on the next click.
    if (!hasAnyContact && !contactWarned) {
      setContactWarned(true);
      return;
    }

    setLoading(true);
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
      await goToMainPage();
    } catch (err) {
      setError(errorMessage(err));
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
            label="Your role or title"
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
            <FieldLabel hint="What you do, or what you can help other members with. e.g. helping founders land their first customers, building websites for small businesses">
              What can you offer or help with?
            </FieldLabel>
            <ChipInput
              value={form.offerings}
              onChange={(v) => set("offerings", v)}
              placeholder="Add one, then press +"
            />
          </div>

          <div>
            <FieldLabel hint="What you're trying to do, or where you're stuck. e.g. marketing my product on a small budget, hiring a technical co-founder">
              What are you working on or need help with?
            </FieldLabel>
            <ChipInput
              value={form.looking_for}
              onChange={(v) => set("looking_for", v)}
              placeholder="Add one, then press +"
            />
          </div>

          <div>
            <FieldLabel hint="A line or two about you and what you do.">
              Short intro (optional)
            </FieldLabel>
            <textarea
              value={form.intro}
              onChange={update("intro")}
              rows={4}
              maxLength={400}
              placeholder="e.g. I run a solar business installing systems for homes and small shops across central Kenya"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />
          </div>

          <div>
            <FieldLabel hint="Choose how members can reach you directly. You can change this anytime.">
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
          {contactWarned && !hasStep1Contact && (
            <ContactNotice>
              No contact method selected. Add WhatsApp or email, or a LinkedIn
              or website on the next step. Tap Continue again to proceed anyway.
            </ContactNotice>
          )}

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

          <PhotoUpload
            value={form.photo_url}
            onChange={(url) => set("photo_url", url)}
          />
          <Input
            label="Primary link (optional)"
            value={form.primary_link}
            onChange={(e) => {
              set("primary_link", e.target.value);
              if (e.target.value.trim()) setContactWarned(false);
            }}
            placeholder="Your website or portfolio"
          />
          <Input
            label="LinkedIn (optional)"
            value={form.links?.linkedin || ""}
            onChange={(e) => {
              set("links", { ...form.links, linkedin: e.target.value });
              if (e.target.value.trim()) setContactWarned(false);
            }}
            placeholder="Your LinkedIn profile link"
          />

          {error && <p className="text-xs text-brand-red">{error}</p>}
          {contactWarned && !hasAnyContact && (
            <ContactNotice>
              You haven&apos;t added any way for members to reach you. Add
              WhatsApp or email in the previous step, or a LinkedIn or website
              here. Tap Finish again to complete anyway.
            </ContactNotice>
          )}

          <div className="pt-1">
            <Button onClick={finish} loading={loading}>
              Finish
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setContactWarned(false);
                setStep(1);
              }}
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
