# Kuzana Connect — Frontend

Next.js (App Router) client for Kuzana Connect. Members register/log in with a
WhatsApp OTP, build a profile, then search, view, and contact other members.

**Live:** `https://connect.kuzana.co` (Vercel). Backend: `https://api.kuzana.co`.

Next.js + React + Tailwind v4 + Zustand + axios + lucide-react + libphonenumber-js.

---

## Stack & conventions
- **Next.js App Router**, JavaScript.
- **Tailwind v4** — brand tokens in `globals.css` via `@theme` (`brand-blue`,
  `brand-yellow`, `brand-navy`, `brand-red`, `brand-ink`, shades). No
  `tailwind.config.js` colors.
- **Zustand** — `authStore` (csrfToken, role, memberNumber),
  `profileStatusStore` (completion state for gating), `notificationStore`.
- **axios** — `authRequest` (CSRF header + refresh-on-401) and `publicRequest`.
- **libphonenumber-js** — country-code phone input + E.164 normalization.

---

## Project structure

```
src/app/
├── layout.js                       # root layout (Toaster mounted)
├── globals.css                     # Tailwind v4 + @theme brand tokens
│
├── auth/                           # PUBLIC (no guard)
│   ├── login/page.js
│   ├── register/page.js            # form + confirm-number step
│   └── verify/page.js
├── welcome/page.js                 # post-verify: "Member #N"
├── onboarding/page.js              # 2-step profile setup
│
├── (app)/                          # GUARDED group — parentheses = NOT in URL
│   ├── layout.js                   # auth guard + profile-status load + AppShell
│   ├── page.js                     # directory (URL "/members")
│   ├── members/[slug]/page.js      # member profile ([slug] = dynamic, NOT (slug))
│   └── profile/edit/page.js        # edit own profile
│
├── store/  { authStore, profileStatusStore, notificationStore }
├── lib/    { api, authService, profileService, logout, onboardingDraft,
│             pendingVerification, slug }
└── components/
    ├── app/   { AppShell, LockedTeaser }
    ├── auth/  { AuthShell, AuthTabs }
    └── ui/    { Button, Input, Logo, ChipInput, IndustryChips, PhoneInput,
                 PhotoUpload, ProgressBar, Toaster }
```

**Route groups:** `(app)` with parentheses does NOT appear in the URL, so
`(app)/page.js` serves at `/`. The guard + shell live in `(app)/layout.js`;
public pages (auth, welcome, onboarding) sit outside it. `[slug]` (square
brackets) is the dynamic segment — using `(slug)` breaks the route (404).

---

## Running locally

```bash
npm install
# .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev            # localhost:3000
```

`NEXT_PUBLIC_API_URL` is read in `lib/api.js` with a localhost fallback. Must
have the `NEXT_PUBLIC_` prefix (Next only exposes those to the browser). Prod
value (Vercel env): `https://api.kuzana.co/api/v1`.

Auth uses HttpOnly cookies, so the backend CORS must allow this origin with
`allow_credentials=True`, and (cross-origin) prod cookies are `SameSite=None; Secure`.

---

## Flow

1. **Register** (`/auth/register`): name → WhatsApp (PhoneInput: searchable
   country dropdown, default KE, E.164) → email, then a **confirm-number** step
   (no account created until confirmed — closes wrong-number/takeover). On
   confirm → `POST /auth/register` + OTP → `/auth/verify`.
2. **Login** (`/auth/login`): PhoneInput number → `send_otp` → `/auth/verify`.
3. **Verify**: reads pending flow from sessionStorage, verifies, stores csrf +
   role + member_number. New member → `/welcome`; returning → `/`.
4. **Welcome**: "Member #N", CTA → `/onboarding`.
5. **Onboarding** (2 steps, progress 40%→80%, localStorage draft): step 1 =
   title, business (opt), location, industry (IndustryChips: common first +
   show-more), offerings + looking-for (ChipInput), intro (opt), and **contact
   toggles** (WhatsApp + Email, both default on; links always public). Step 2 =
   photo (PhotoUpload → S3), primary link, LinkedIn. "Save & exit" after step 1.
   On finish → member's own profile.
6. **Directory** (`/`, guarded): direction toggle (find-what-I-need /
   find-who-needs-me), search, collapsed industry + location filters, member
   grid. Locked+greyed teaser if the viewer hasn't completed their MVP profile.
7. **Member profile** (`/members/{slug}-{number}`): identity, contact (only the
   channels the member enabled + always their links), offers/looking-for,
   member #. Own profile adds Edit + a Delete-account action at the bottom.
   Blocked with a teaser if the viewer's own profile is incomplete.

### Guard (`(app)/layout.js`)
On every guarded load: check auth (refresh once, else → `/auth/login`), then
load profile completion into `profileStatusStore`. Pages read it to lock
themselves when the member hasn't reached `mvp`. Running on every load closes
the URL-escape-onboarding path. Wraps children in `AppShell` (top bar + account
menu: My profile, Log out).

---

## Key components
- **PhoneInput** — country dropdown (type-to-filter, flag + dial code, KE
  default) + number field; parses/validates via libphonenumber-js, emits E.164.
- **PhotoUpload** — resizes to ~512px WebP client-side, gets a presigned URL,
  PUTs directly to S3, returns the public URL. No bytes through our API.
- **ChipInput** — add-one-at-a-time free-text chips (offerings/looking-for);
  blocks the `|` delimiter.
- **IndustryChips** — selectable chips, common sectors first, show-more for the
  tail; selected-but-hidden chips stay visible.
- **LockedTeaser** — overlay (directory) / block (other pages) for members
  without a completed profile.

---

## State & storage
- **authStore** (in-memory): csrfToken, role, memberNumber.
- **profileStatusStore**: isSearchable, completionStatus, memberNumber, fullName
  (loaded by the guard, drives locking).
- **notificationStore**: `notify(msg, type, duration)`; rendered by `<Toaster/>`.
- **sessionStorage** (pendingVerification): `{whatsapp_number, flow}` across OTP.
- **localStorage** (onboardingDraft): in-progress onboarding, cleared on finish.

---

## Deploy (Vercel)
Repo is org-owned (`kyle-grantco`). Project on the org's Vercel; env
`NEXT_PUBLIC_API_URL=https://api.kuzana.co/api/v1`; domain `connect.kuzana.co`
via a CNAME to Vercel. Lint (`react-hooks/set-state-in-effect`) warns on a few
effects but doesn't block the build.

---

## Known gaps / TODO
- Admin UI (`/admin`) — pending backend RBAC.
- Settings page — contact prefs + edits (edit page exists; formalize).
- Search "smarter"/AI fallback — pending backend work.
- Directory scroll preservation on back (currently `push("/members")`; a `replace`-based
  history fix is noted but not applied).
- Lint cleanup (welcome's unnecessary effect; silence the valid fetch-effects).
- `.js` vs `.jsx` extension standardization.
- Work-email-separate-from-login-email (deferred).