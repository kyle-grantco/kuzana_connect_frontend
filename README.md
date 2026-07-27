# Kuzana Connect — Frontend

Next.js (App Router) client for Kuzana Connect. Members register/log in with a
WhatsApp OTP, complete a profile, then search and view other members and contact
them over WhatsApp.

Next.js + React + Tailwind (v4) + Zustand + axios + lucide-react.

---

## Stack & conventions
- **Next.js App Router**, JavaScript (not TS).
- **Tailwind v4** — theme defined in `globals.css` via `@theme` (brand colors as
  `brand-blue`, `brand-yellow`, `brand-navy`, `brand-red`, `brand-ink`, with
  shades). No `tailwind.config.js` colors.
- **Zustand** — `authStore` (csrfToken, role, memberNumber), `notificationStore`.
- **axios** — `authRequest` (CSRF header + refresh-on-401) and `publicRequest`.
- **lucide-react** — icons.

---

## Project structure

```
src/app/
├── layout.js                       # root layout (public shell, Toaster mounted)
├── globals.css                     # Tailwind v4 import + @theme brand tokens
│
├── auth/                           # PUBLIC (no auth guard)
│   ├── login/page.js
│   ├── register/page.js            # form + confirm-number step
│   └── verify/page.js              # OTP entry, resend, remember-device
├── welcome/page.js                 # post-verify: shows "Member #N"
├── onboarding/page.js              # 2-step profile setup
├── profile/edit/page.js            # edit own profile
│
├── (app)/                          # GUARDED group — parentheses = NOT in URL
│   ├── layout.js                   # auth guard + AppShell wrapper
│   ├── page.js                     # directory (URL "/")
│   └── members/[slug]/page.js      # member profile view ([slug] = dynamic)
│
├── store/
│   ├── authStore.js
│   └── notificationStore.js
├── lib/
│   ├── api.js                      # axios instances + interceptors
│   ├── authService.js              # register / sendOtp / verifyOtp
│   ├── profileService.js           # profile + industries + search calls
│   ├── logout.js
│   ├── onboardingDraft.js          # localStorage draft persistence
│   ├── pendingVerification.js      # sessionStorage OTP-flow state
│   └── slug.js                     # name <-> url slug + member-number parse
└── components/
    ├── app/AppShell.jsx            # top bar + account menu (guarded pages)
    ├── auth/{AuthShell,AuthTabs}.jsx
    └── ui/{Button,Input,Logo,ChipInput,ProgressBar,Toaster}.jsx
```

### Route grouping (important)
`(app)` is a **route group** — parentheses mean it does NOT appear in the URL.
So `(app)/page.js` serves at `/` and `(app)/members/[slug]/page.js` at
`/members/...`. The guard + shell live in `(app)/layout.js` and protect
everything inside. Public pages (`auth/*`, `welcome`, `onboarding`) sit OUTSIDE
the group and are unguarded. `[slug]` (square brackets) is the dynamic segment —
NOT `(slug)`.

---

## Running locally

```bash
npm install                          # next, react, axios, zustand, lucide-react, tailwindcss@4, @tailwindcss/postcss
cp .env.local.example .env.local     # set NEXT_PUBLIC_API_URL
npm run dev
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Auth uses HttpOnly cookies, so the backend CORS must allow this origin with
`allow_credentials=True` (explicit origin, not `*`). In dev, a Next rewrite proxy
to make frontend + backend same-origin avoids cross-port cookie issues.

---

## Auth & routing flow

1. **Register** (`/auth/register`): name → WhatsApp → email, then a confirm-number
   step (no account is created until the number is confirmed — this prevents
   wrong-number/takeover edge cases). On confirm, `POST /auth/register` creates
   the account + sends the OTP; routes to `/auth/verify`.
2. **Login** (`/auth/login`): WhatsApp number → `POST /auth/send_otp` → `/auth/verify`.
3. **Verify** (`/auth/verify`): reads the pending flow from sessionStorage (so it
   survives leaving to WhatsApp / refresh), verifies, stores `csrf_token` + `role`
   + `member_number` in `authStore`. Routes:
   - new member (no profile) → `/welcome`
   - returning member → `/` (directory)
   Register-flow hides "use a different number" (already confirmed); login shows it.
4. **Welcome** (`/welcome`): shows "Member #N", one CTA → `/onboarding`.
5. **Onboarding** (`/onboarding`): 2 steps with a progress bar (40% → 80%),
   localStorage draft (survives bounce/refresh, cleared on completion),
   "Save & exit" after step 1. On finish → redirects to the member's own profile.
6. **Directory** (`/`, guarded): direction toggle (find-what-I-need /
   find-who-needs-me), search box, collapsed industry + location filters, member
   grid. Tap a card → profile.
7. **Member profile** (`/members/{slug}-{number}`, guarded): identity, contact
   (WhatsApp), offers/looking-for, member number. If it's the viewer's own
   profile: Edit button (→ `/profile/edit`) and a Delete-account option at the
   bottom.

### The guard (`(app)/layout.js`)
On mount: `checkAuthStatus()`; on failure try `refreshSession()`; if both fail,
clear auth and redirect to `/auth/login`. Shows a spinner while checking, then
renders children inside `AppShell`.

---

## State & storage
- **authStore** (in-memory): `csrfToken`, `role`, `memberNumber`. Reset on logout.
- **notificationStore**: `notify(message, type, duration)`; rendered by `<Toaster/>`
  mounted in the root layout.
- **sessionStorage** (`pendingVerification`): `{whatsapp_number, flow}` across the
  OTP round-trip.
- **localStorage** (`onboardingDraft`): in-progress onboarding fields.

---

## Theming
Brand tokens in `globals.css` under `@theme` generate Tailwind utilities:
`bg-brand-blue`, `hover:bg-brand-blue-600`, `bg-brand-yellow-100`,
`text-brand-navy`, `text-brand-red`, `bg-brand-blue-50`, etc. CSS vars
(`var(--brand-blue)`) are also available for inline styles. Offer chips use the
blue tint, looking-for uses gray, yellow is reserved for highlights/active states.

---

## Known gaps / TODO
- Session cookie fix (logout 401 in cross-origin dev) — pairs with the backend CORS/cookie fix.
- WhatsApp number field should prefill/enforce country code (`+254`).
- Photo is a URL field; real uploads (presigned S3/DO Spaces) pending.
- Completion reminders for users who bounced mid-onboarding (blocking for
  no-MVP, banner for mvp-not-done) not yet built.
- AI "search smarter" fallback not yet added.