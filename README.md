# Kuzana Connect — Frontend

Next.js (App Router) client for **Kuzana Connect**, a member-discovery and
trusted-introduction network for the Kuzana community (Kenyan founders / SME
operators).

Members sign in with a WhatsApp OTP, build a profile describing what they offer and
what they're looking for, see proactively computed **suggestions** of complementary
members, and connect through a **double opt-in request flow**. Contact details
render only after a request is accepted — and the API doesn't send them before
that, so this client isn't the thing keeping them secret.

**Live:** `https://connect.kuzana.co` (Vercel).
Backend: `https://api.kuzana.co` (FastAPI on EC2, separate repo).

**Stack:** Next.js 16 (App Router, **plain JavaScript, no TypeScript**) · React 19 ·
Tailwind CSS v4 · Zustand · axios · lucide-react · libphonenumber-js.

> This README is the map; the code is the territory. Components and lib modules
> carry comments explaining their own logic — read those for specifics.

---

## Contents

- [Running locally](#running-locally)
- [Structure and routing](#structure-and-routing)
- [The API client](#the-api-client)
- [The auth guard](#the-auth-guard)
- [State management](#state-management)
- [Key flows](#key-flows)
- [Styling](#styling)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Conventions and gotchas](#conventions-and-gotchas)

---

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

The backend must be running at `http://localhost:8000` (or set
`NEXT_PUBLIC_API_URL`). Because cookies drive auth, three things matter:

- The backend must **not** have `ENV=production`, or cookies are issued
  `Secure; SameSite=None` and the browser drops them over plain HTTP — you'll
  appear logged out immediately after logging in.
- The backend's `CORS_ORIGINS` must include `http://localhost:3000` exactly, no
  trailing slash.
- Use `localhost` consistently. Mixing `127.0.0.1` and `localhost` gives you two
  cookie jars.

To get past the OTP screen, read the code from the backend's console (Twilio is
stubbed unless `TWILIO_LIVE=1`). You also need the backend's
`COMMUNITY_ACCESS_CODE` to register without an invite.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.
Path alias `@/*` → `./src/*`, so imports read `@/app/lib/api`.

---

## Structure and routing

Everything lives under `src/app`. No `pages/`, no API routes, almost no
server-side code — it's a client-rendered SPA wearing the App Router. Nearly every
page starts with `"use client"`.

```
src/app/
  layout.js                  root layout: fonts, metadata, <Toaster/>
  page.js                    public landing page (server component)
  terms/ privacy/            policy pages
  unsubscribe/               public, token-based email opt-out
  feedback/                  public, token-based post-connection feedback
  invite/[token]/            public invite landing (+ server-side OG metadata)
  welcome/  onboarding/      post-verification screen, 2-step profile creation
  auth/                      login, register, verify

  (app)/                     ROUTE GROUP: everything behind the auth guard
    layout.js                the guard + AppShell wrapper
    members/                 directory + search + suggestions (the home screen)
    members/[slug]/          a member's profile
    profile/edit/  settings/
    connections/requests/
    admin/                   overview, users, connections, comms

  lib/                       API services + pure helpers
  store/                     Zustand stores
  components/  app/ auth/ ui/ policy/
```

**The `(app)` route group is the security boundary.** It adds no URL segment, but
every route inside shares `(app)/layout.js`, which runs the auth and
profile-completion checks before rendering. Anything reachable while logged out
(landing, auth, invite, unsubscribe, feedback, policies) lives **outside** it.

**All server communication goes through `lib/api.js`.** Pages call a function in
`lib/*Service.js`, never axios directly — that's what guarantees CSRF headers and
token refresh apply uniformly. Two deliberate exceptions: `PhotoUpload.jsx` uses
raw `fetch` to PUT to S3 (which must *not* carry our headers), and
`invite/[token]/page.js` uses server-side `fetch` for OpenGraph metadata before any
session exists.

Public routes worth knowing: `/invite/[token]` generates OG metadata server-side so
WhatsApp link previews show the inviter; `/unsubscribe?token=` and
`/feedback?token=` are opened straight from emails and authenticate with an
HMAC token instead of a session.

---

## The API client

`lib/api.js` is the most important file here. Read it before changing anything
auth-related.

Two axios instances, both `withCredentials: true`:

- **`authRequest`** — authenticated calls. Injects CSRF, refreshes on 401, retries.
- **`publicRequest`** — pre-auth calls (register, OTP, refresh, unsubscribe,
  feedback).

**CSRF is double-submit.** The access token is HttpOnly, so the client never
handles it; what it must do is echo the readable `csrf_access_token` cookie back as
an `X-CSRF-TOKEN` header. The store hydrates from that cookie at creation and the
request interceptor falls back to reading it directly — without that, the first
request after a page load would 401, refresh, and retry, multiplying requests and
tripping the server's rate limiter.

**Single-flight refresh — the important part.** When the 15-minute access token
expires, several in-flight requests 401 at once. Refresh tokens rotate, so
*overlapping* refreshes are fatal: both carry the same pre-rotation cookie, the
backend rotates on the first, and the second is a replay of a retired token → 401 →
forced logout. That was the origin of the long-standing random-logout bug.

The fix shares one refresh promise across every concurrent 401. The guard is
cleared on a **macrotask** (`setTimeout`), not in `.finally()` — a `.finally()`
callback runs as a microtask *before* the awaiting interceptor resumes, leaving a
window where a later 401 saw a null guard and started a second refresh. The
backend's 15-second rotation grace is the other half of this fix; both halves are
needed.

`refreshSession` is **private and deliberately not exported** — it bypasses the
guard. The only safe way to refresh from outside the module is
`refreshSessionShared()`.

**On hard auth failure**, `handleAuthFailure()` collapses a burst of failures using
a 5-second *timestamp* (not a boolean — a latched boolean never reset if the
redirect didn't complete, silently killing all later expiries), clears both store
and CSRF cookie (a stale cookie re-hydrates and makes the first login-page action
fail), toasts, then does a **full-page** navigation to `/auth/login` so module state
resets.

---

## The auth guard

`(app)/layout.js` runs on every guarded route: `checkAuthStatus()`, then
`getMyProfile()` to populate `profileStatusStore`. It renders a spinner until both
resolve, so a guarded page never flashes first.

**A `false` from `checkAuthStatus()` is terminal.** It went through `authRequest`,
whose interceptor already attempted the shared refresh and retried. Refreshing
again here would be a second, unguarded refresh — the exact random-logout bug.

**Profile completion is enforced here, not per page.** Because the guard runs on
every `(app)` route and writes `completionStatus` to the store, a member can't
URL-escape onboarding. Pages read the store and render `LockedTeaser` themselves
(`overlay` over the directory, `block` for another member's profile — your own is
always viewable).

The **admin** area adds a second check in `(app)/admin/layout.js` that hides the UI
from non-admins. It's purely cosmetic — the backend enforces roles on every admin
endpoint regardless.

Note a guarded page load fetches `/profiles/me` up to three times (guard,
`AppShell`, and pages needing role or name). An obvious consolidation target.

---

## State management

Five small Zustand stores in `src/app/store/`. No providers; non-React modules read
state with `useStore.getState()`.

| store | holds |
|---|---|
| `authStore` | `role`, `csrfToken`, `memberNumber`. **Initializes `csrfToken` from the readable cookie** rather than `null` — the cookie is the persistence layer |
| `profileStatusStore` | completion status written once by the guard, read by pages to decide whether to lock |
| `notificationStore` | the **toast** system (unrelated to the in-app bell). `notify(msg, type, duration)`; `0` persists until dismissed. Rendered by `<Toaster/>` in the root layout, so `api.js` can toast from outside React |
| `searchStore` | full directory search snapshot, so returning from a profile doesn't lose the query, filters, or an expensive AI result set. `hasSearched` distinguishes first mount from a restore |
| `connectionQuotaStore` | a `{version, bump()}` signal so the nav quota refetches after a request is sent, without prop-drilling |

---

## Key flows

### Registration and login

`/invite/[token]` → `/auth/register?invite=TOKEN` → `/auth/verify`, or
`/auth/login` (phone) → `/auth/verify`.

Register resolves its invite token once on mount: the query param wins and is
mirrored to sessionStorage; with neither, the page shows a blocked state. Without
an invite, the community code is validated on its own step so a wrong code fails
before account creation.

The OTP is always **keyed by phone number** regardless of delivery channel, so
choosing email doesn't change verification. `/auth/verify` persists its state to
sessionStorage (surviving the round-trip to WhatsApp), runs a 60s resend ticker, and
offers a WhatsApp ↔ email channel switch.

On success, routing keys off `onboarding_status`: `not_started` → `/welcome` →
`/onboarding`, anything else → `/members`.

### Onboarding

Two steps: `POST /profiles/mvp` (required fields — makes the member searchable and
triggers backend matching) then optional `POST /profiles/enrichment`.

**The contact nudge is warn-once, not a block.** With no contact channel selected,
the first Continue shows an amber notice and stops; a second click proceeds. A
member may legitimately be reachable only via a public link, or not at all.

**Draft persistence:** edits write to localStorage, but the form initializes from
the exported `EMPTY` constant and merges the draft in a post-mount effect behind a
`hydrated` flag — reading storage during initial state would break hydration.

### Directory and suggestions (`/members`)

The home screen stacks `SuggestionsSections` (the primary value) above the
directory and search.

Infinite scroll via `IntersectionObserver`, with results **deduped by
`member_number`** (the observer can double-fire and new rows shift page offsets).
`hasMore` excludes AI-expanded results, since an expanded query isn't stable across
pages. `userChangedRef` distinguishes a user-driven filter change from initial
mount, so a restored search doesn't refetch.

Suggestions render as **one ranked list**, each card showing the strongest reason by
`w * sim`, phrased to assert only the *other* member's side ("They offer X"). After
a profile edit, `/profile/edit` sets a sessionStorage flag; the component reads it
once, shows an "updating" note, and refetches after 5s to let the backend's
background recompute finish.

### Member profile and connecting

`/members/[slug]` parses the trailing number out of the slug (the name part is
cosmetic). Three states: not found, `profile_complete: false` (joined but not
onboarded — identity, inviter and received endorsements only), or the full profile.

Contact gating mirrors the API exactly, driven by fields it computes: own profile or
`is_connected` → `ReachOutBlock` with real contacts; `request_status === "pending"`
→ a disabled state that never reopens the compose form; otherwise the **Connect**
button → `ConnectRequestModal`.

`ReachOutBlock` builds a prefilled first message plus `wa.me` and `mailto:` deep
links. On your own profile it instead shows the channels others will see.

`/connections/requests` has Received/Sent tabs; accepting toasts, and surfaces a
second nudge when the API returns `i_have_no_contact`.

### Post-connection feedback (`/feedback?token=`)

The backend emails two follow-ups to whoever made a connection: a day-2 "have you
reached out" nudge and a day-5 "how did it go" nudge. The second links here.

Public, no session — the HMAC token identifies both members. Four states:
`loading` → `ready` (form) or `invalid`, then `done` after submit. It collects
reached-out, useful, a 1–5 relevance score and an optional note.

**Nothing is required and the submit button is never disabled for validation**, so
an empty response can be submitted. A failed submit silently clears `saving` with
no error shown — worth knowing when someone reports "the button does nothing".

### Settings, unsubscribe, photo upload

`/settings` holds account-level concerns (email opt-out, delete account),
deliberately separate from profile *content* at `/profile/edit`.

`/unsubscribe?token=` lives here rather than linking emails at the API, keeping the
destination same-origin and avoiding a bare JSON response in the browser.

`PhotoUpload.jsx` resizes to WebP on a canvas, gets a presigned URL, then PUTs
**straight to S3 with raw `fetch`** — no credentials or CSRF header, since the
signature authorizes it and extra headers would break it. The API never sees the
bytes.

### Admin

`(app)/admin/page.js` renders `GET /admin/metrics` as stat sections, in order:
Accounts, Connection activity, Connection feedback, Profiles, Invites, Search,
Members by industry, Scheduled emails. Each section is conditional on its block
being present, so an older backend omits it rather than erroring.

The Accounts section carries a **new-members metric with a day/week/month toggle**
(local `newPeriod` state selecting from `metrics.accounts.new_members`).
Connection feedback shows responses, useful, reached-out and average relevance,
rendering an em-dash when `avg_relevance` is `null`.

Note the backend still computes and returns `contact_prefs`, but the dashboard no
longer renders it.

---

## Styling

Tailwind **v4**, configured in CSS — there is no `tailwind.config.js`.
`globals.css` imports Tailwind and declares brand tokens under `@theme`, which
auto-generates utilities: `brand-navy`, `brand-blue` (+ `-50/-600/-700`),
`brand-yellow` (+ `-50/-100`), `brand-ink`, `brand-red`. Use those, not raw hex.

The backend's email templates hard-code the same palette independently
(`services/email.py`), so a rebrand means changing both.

Mobile-first throughout — the community lives on WhatsApp. Icons are
`lucide-react`; font is Inter via `next/font/google`. The app is installable as a
PWA (manifest + icons) but there's **no service worker**, so no offline support.

---

## Environment variables

Only two, both public by definition (`NEXT_PUBLIC_` is inlined into the client
bundle — never put a secret here).

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend base URL, **including `/api/v1`**, no trailing slash |
| `NEXT_PUBLIC_SITE_URL` | `https://connect.kuzana.co` | This app's own origin; builds shareable invite links and absolute OG URLs |

Changing either requires a **rebuild**, not just a restart.

---

## Deployment

Vercel, building from the default branch. `next.config.mjs` is intentionally empty.

1. Set `NEXT_PUBLIC_API_URL=https://api.kuzana.co/api/v1` and
   `NEXT_PUBLIC_SITE_URL=https://connect.kuzana.co` in the Vercel project.
2. Confirm the backend's `CORS_ORIGINS` contains the exact frontend origin and that
   it runs with `ENV=production` so cookies are `Secure; SameSite=None`.

**If the app logs in and then immediately behaves as logged-out in production, it's
almost always one of those two settings**, not the client code.

---

## Conventions and gotchas

**JavaScript, not TypeScript.** Don't introduce `.ts`/`.tsx`.

**`AGENTS.md` (aliased by `CLAUDE.md`) warns this Next.js version has breaking
changes** relative to older conventions — read `node_modules/next/dist/docs/`
before writing code. One visible consequence: dynamic route params are a
**Promise** (`const { token } = await params;`).

**`useSearchParams` requires a Suspense boundary.** Pages using it
(`/auth/register`, `/unsubscribe`, `/feedback`) split into an inner component
wrapped in `<Suspense>`. Forgetting this breaks the build, not just runtime.

**Never render a FastAPI error object directly.** Validation errors arrive as
`detail: [{type, loc, msg, …}]`, others as `detail: "string"`. Rendering the array
throws React's "Objects are not valid as a React child" — use the `errorMessage(err)`
helper pattern.

**Never read browser storage during initial state.** Server and client must render
identically; load it in a post-mount effect behind a `hydrated` flag.

**Never import the raw `refreshSession`.** Use `refreshSessionShared()`.

**The profile URL slug is cosmetic** — only the trailing number is parsed. Don't
build logic on the slug text.

**Bare URLs need `ensureUrl`**, or `example.com` resolves relative to our own site.

**Suspended and deleted members disappear because the backend filters them**, not
the client. Don't duplicate that filtering — you'd hide legitimate
incomplete-profile members the API deliberately returns.

### Known inconsistencies

- `suggestionService.js`'s doc comment describes a removed `{can_help, needs_me}`
  response shape; the API returns a single `suggestions` list.
- `remember_device` is collected by the verify checkbox and sent, but the backend
  ignores it — the checkbox has no effect.
- Notification endpoints live in `connectionRequestService.js`, not a notification
  service.
- `AppShell` destructures an unused `notify`.
- `searchStore.reset()` doesn't reset `direction` though `save()` writes it; and
  the members page reads `saved.total` / `saved.page`, which aren't in the store's
  initial state.
- `/feedback` can submit an all-null response, shows no error on failure, and its
  "Back to Connect" link points at the guarded `/members`.
