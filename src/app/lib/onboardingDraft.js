// Persists in-progress onboarding to localStorage so a user who leaves midway
// finds their progress on return. Cleared once the profile is complete.

const KEY = "kc_onboarding_draft";

const EMPTY = {
  title: "",
  business_name: "",
  intro: "",
  location: "",
  industry_ids: [],
  offerings: [],
  looking_for: [],
  contact_whatsapp: true,
  contact_email: true,
  contact_socials: true,
  photo_url: "",
  primary_link: "",
  links: {},
};

export function loadDraft() {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveDraft(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
