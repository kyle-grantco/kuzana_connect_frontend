# Kuzana Connect — Frontend

Next.js (App Router) client for **Kuzana Connect**, a member-discovery and
trusted-introduction network for the Kuzana community (Kenyan founders / SME
operators). ~260 members.

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
- [Admin dashboard](#admin-dashboard)
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
  `Secure; SameSite=None` and the browser drops them over plain HTTP.
- The backend's `CORS_ORIGINS` must include `http://localhost:3000` exactly, no
  trailing slash.
- Use `localhost` consistently (mixing `127.0.0.1` and `localhost` = two cookie
  jars).

To get past the OTP screen, read the code from the backend's console. You also need
the backend's `COMMUNITY_ACCESS_CODE` to register without an invite.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.
Path alias `@/*` → `./src/*`.

---

## Structure and routing

Everything lives under `src/app`. Client-rendered SPA on the App Router; nearly
every page starts with `"use client"`.

```
src/app/
  layout.js                  root layout: fonts, metadata, <Toaster/>
  page.js                    public landing page
  terms/ privacy/            policy pages
  unsubscribe/               public, token-based email opt-out
  feedback/                  public, token-based post-connection feedback
  invite/[token]/            public invite landing (+ server-side OG metadata)
  welcome/  onboarding/      post-verification screen, 3-step profile creation
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
  components/  app/ auth/ ui/ admin/ policy/
```

**The `(app)` route group is the security boundary** — every route inside shares
`(app)/layout.js`, which runs the auth and profile-completion checks before
rendering. Anything reachable while logged out lives **outside** it.

**All server communication goes through `lib/api.js`.** Pages call a function in
`lib/*Service.js`, never axios directly. Exceptions: `PhotoUpload.jsx` (raw `fetch`
PUT to S3) and `invite/[token]/page.js` (server-side `fetch` for OG metadata).

Public token routes: `/invite/[token]` (OG preview), `/unsubscribe?token=`,
`/feedback?token=` — opened from emails, authenticated by HMAC token, not a session.

---

## The API client

`lib/api.js` is the most important file here. Two axios instances, both
`withCredentials: true`: **`authRequest`** (CSRF inject, refresh-on-401, retry) and
**`publicRequest`** (pre-auth).

**CSRF is double-submit.** The access token is HttpOnly; the client echoes the
readable `csrf_access_token` cookie as an `X-CSRF-TOKEN` header. The store hydrates
from that cookie at creation and the interceptor falls back to reading it directly.

**Single-flight refresh.** When the 15-minute access token expires, concurrent 401s
share ONE refresh promise. Refresh tokens rotate, so overlapping refreshes are
fatal (second replays a retired token → forced logout — the origin of the historic
random-logout bug). The guard is cleared on a **macrotask** (`setTimeout`), not
`.finally()`. The backend's 15-second rotation grace is the other half; both are
needed.

`refreshSession` is **private, not exported** — refresh from outside the module
only via `refreshSessionShared()`.

**On hard auth failure**, `handleAuthFailure()` collapses a burst using a 5-second
timestamp, clears store + CSRF cookie, toasts, then does a full-page navigation to
`/auth/login`.

---

## The auth guard

`(app)/layout.js` runs on every guarded route: `checkAuthStatus()`, then
`getMyProfile()` to populate `profileStatusStore` (now including `hasTraction`,
read by `AppShell` to show the add-traction banner). Renders a spinner until both
resolve.

**A `false` from `checkAuthStatus()` is terminal** — don't refresh again here (that
was the random-logout bug). Profile completion is enforced here, not per page.

The **admin** area adds a cosmetic check in `(app)/admin/layout.js`; the backend
enforces roles regardless.

Note a guarded page load fetches `/profiles/me` up to three times (guard,
`AppShell`, pages needing role/name) — an obvious consolidation target.

---

## State management

Zustand stores in `src/app/store/`:

| store | holds |
|---|---|
| `authStore` | `role`, `csrfToken`, `memberNumber`. Initializes `csrfToken` from the readable cookie |
| `profileStatusStore` | completion status + `hasTraction` (written by the guard, read to lock pages and drive the traction banner) |
| `notificationStore` | the toast system; `notify(msg, type, duration)`, rendered by `<Toaster/>` so `api.js` can toast from outside React |
| `searchStore` | directory search snapshot, so returning from a profile keeps query/filters/results |
| `connectionQuotaStore` | a `{version, bump()}` signal so the nav quota refetches after a request is sent |

---

## Key flows

### Registration and login

`/invite/[token]` → `/auth/register?invite=TOKEN` → `/auth/verify`, or
`/auth/login` → `/auth/verify`. OTP is keyed by phone number regardless of
channel. On success, routing keys off `onboarding_status`: `not_started` →
`/welcome` → `/onboarding`, else `/members`.

### Onboarding (3 steps — CHANGED from 2)

The MVP form is now split cosmetically across **3 steps** (the backend MVP save is
unchanged — it still fires at the end of step 2):

- **Step 1 "About you":** title, business name, location, industry.
- **Step 2 "Your business":** offerings, looking-for, intro, **traction (optional,
  new)**, contact toggles → `POST /profiles/mvp` (makes the member searchable,
  triggers matching). Save-and-exit available here.
- **Step 3 "Almost done":** photo, links → `POST /profiles/enrichment`.

Progress bar 33/66/100. The **contact nudge is still warn-once, not a block.**
Draft persists to localStorage (initialized from `EMPTY`, merged post-mount behind
a `hydrated` flag).

**ChipInput commit-on-blur (fix):** offerings/looking-for chips now auto-commit a
typed-but-not-added item when the input blurs (moving to the next field or clicking
Continue), so members who don't click "+" no longer lose input or get wrongly
blocked.

### Directory and suggestions (`/members`)

The home screen stacks `SuggestionsSections` above the directory and search.
Infinite scroll via `IntersectionObserver`, deduped by `member_number`. Suggestions
render as one ranked list, each card showing the strongest reason ("They offer X").
After a profile edit, a sessionStorage flag makes the component show an "updating"
note and refetch after 5s (background recompute).

### Member profile and connecting

`/members/[slug]` parses the trailing number from the slug. Three states: not
found, `profile_complete: false` (identity + inviter + endorsements only), or the
full profile. The full profile renders intro, then **traction** (if present), then
industry/offers/looking-for.

Contact gating mirrors the API: own profile or `is_connected` → `ReachOutBlock`;
`request_status === "pending"` → disabled state; else **Connect** →
`ConnectRequestModal`.

**ConnectRequestModal (intent-gated — CHANGED):** the request note now requires a
real reason — min 30 chars, max 300, send disabled until the minimum is met, with a
"N more characters" hint. Copy is tuned for the exec/founder audience ("Reach out
to {name}", "Why are you reaching out?", placeholder "Your reason for connecting").
The quota line shows "{N} left this week"; when out, "No requests left · resets
Monday". Success toast: "Request sent to {name}. They'll be notified and can accept
to connect."

### Connection quota (calendar-week — CHANGED)

The weekly connection limit is now **calendar-week (resets Monday 00:00 UTC)**, not
rolling. The nav `ConnectionQuota` pill shows "{N} left" (desktop only), with
"resets Monday" in its tooltip. The connections page always shows "You can send N
connection requests a week, resets Monday. {N} left this week." The modal shows the
reset only when the quota is spent.

### Post-connection feedback (`/feedback?token=`)

Public, no session (HMAC token identifies both members). Collects reached-out,
useful, 1–5 relevance, optional note. Nothing is required; a failed submit silently
clears `saving`. Note: in production, feedback responses are ~0 (useful-rate is
confirmed via manual follow-up instead).

### Traction nudge banner

`AppShell` renders a reusable **`Banner`** (brand-themed: `update` = soft brand-blue
with a sparkles icon, plus `accent`/`urgent` variants — NOT generic info/warning
colors). The traction nudge shows when the member is searchable but has no traction
(`profileStatusStore.hasTraction` false), dismissible per session (reappears next
login), linking to `/profile/edit#traction`. Edit-profile sections now carry `id`
anchors (`#traction`, `#offerings`, etc.) + a deep-link scroll effect, so the banner
lands on and focuses the traction field.

### Settings, unsubscribe, photo upload

`/settings` holds account-level concerns (email opt-out, delete account), separate
from profile content at `/profile/edit`. `PhotoUpload.jsx` resizes to WebP and PUTs
straight to S3 with raw `fetch` (no credentials/CSRF).

---

## Admin dashboard

`(app)/admin/page.js` renders `GET /admin/metrics` plus several per-period cards.
Sections, in order: **Accounts** (with activation cards), **Engagement**,
**Connection activity**, **Connection feedback**, **Profiles**, **Invites**,
**Search**, **Members by industry**, **Scheduled emails**.

**Per-period cards (MetricCard / ActivationCard / the count endpoint).** Several
metrics are now fixed cards with their own period dropdown (today / yesterday /
this week / last week / month / months-back / custom), each fetching
`GET /admin/metrics/count?metric=&date_from=&date_to=`:

- **Accounts:** three **`ActivationCard`s** — each shows `New | Discoverable (%)`
  for a period (new members who joined vs how many became discoverable = the
  activation rate). Plus all-time account counts.
- **Engagement:** Online now, DAU (Active today), WAU (this week), Returning WAU
  (% of weekly actives who joined >7d ago), Stickiness (WAU ÷ active members), MAU.
  WAU/MAU are rolling windows (they shift daily — expected).
- **Connection activity:** `MetricCard`s for Requests sent and Accepted (same
  period, so the absolute accept rate reads against absolute volume), plus all-time
  totals and **Pending (fresh)** vs **Pending (stale)** (newer/older than 7 days —
  tells a lag backlog from an ignored one).
- **Profiles:** includes a **With traction** stat.

**MetricCard flicker fix:** the option list is memoized on a stable key
(`options.join("|")`), not the array reference, so a parent re-render doesn't snap
an open `<select>` shut. (Some residual flicker while several cards' initial
fetches resolve is cosmetic, admin-only, and self-settles.)

**Admin connections page** (`/admin/connections`): each member's **phone number**
now renders under their name for follow-up without a lookup. Ordering: the
**accepted** tab sorts by date accepted (`responded_at`); all other tabs sort by
date sent (`created_at`), so newly-sent requests surface at the top of "all"/"pending".

**adminService.js:** `getMetrics({dateFrom,dateTo})`, `getMetricCount({metric,
from, to})`, `listUsers({..., inviters_only})` (an Inviters filter tab on the users
page).

---

## Styling

Tailwind **v4**, configured in CSS (no `tailwind.config.js`). `globals.css`
declares brand tokens under `@theme`: `brand-navy`, `brand-blue` (+ `-50/-600/-700`),
`brand-yellow` (+ `-50/-100`), `brand-ink`, `brand-red`. Use those, not raw hex.

The backend's email templates hard-code the same palette independently
(`services/email.py`); the email **page background was changed to slate `#f1f5f9`**
(matching the app) and content width to 600px this cycle, so a rebrand still means
changing both.

Mobile-first. Icons `lucide-react`, font Inter. Installable PWA (manifest + icons),
no service worker (no offline).

---

## Environment variables

Two, both public (`NEXT_PUBLIC_`):

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend base, **including `/api/v1`**, no trailing slash |
| `NEXT_PUBLIC_SITE_URL` | `https://connect.kuzana.co` | This app's origin; invite links + OG URLs |

Changing either requires a **rebuild**.

---

## Deployment

Vercel, building from the default branch (org `kyle-grantco`). Set
`NEXT_PUBLIC_API_URL=https://api.kuzana.co/api/v1` and
`NEXT_PUBLIC_SITE_URL=https://connect.kuzana.co`. Confirm the backend's
`CORS_ORIGINS` contains the exact frontend origin and runs `ENV=production`.

> **If the app logs in then immediately behaves as logged-out in production, it's
> almost always one of those two settings, not the client.**

> **If a GitHub push succeeds but Vercel doesn't deploy**, the webhook missed the
> commit (seen after GitHub incidents). Manually redeploy from the Vercel dashboard
> or push an empty commit to re-trigger.

---

## Conventions and gotchas

**JavaScript, not TypeScript.** Don't introduce `.ts`/`.tsx`.

**Next 16 specifics:** dynamic route params are a Promise (`const { token } = await
params;`); `useSearchParams` requires a `<Suspense>` boundary (`/auth/register`,
`/unsubscribe`, `/feedback`).

**Never render a FastAPI error object directly** — use the `errorMessage(err)`
helper (validation errors are `detail: [{msg,...}]`).

**Never read browser storage during initial state** — load in a post-mount effect
behind a `hydrated` flag.

**Never import raw `refreshSession`** — use `refreshSessionShared()`.

**The profile URL slug is cosmetic** — only the trailing number is parsed.

**Bare URLs need `ensureUrl`.**

**Suspended/deleted members are filtered by the backend**, not the client.

**Memoize native `<select>` option lists on a stable key**, or a parent re-render
closes an open dropdown (the MetricCard flicker).

### Known inconsistencies

- `suggestionService.js`'s doc comment describes a removed `{can_help, needs_me}`
  shape; the API returns a single `suggestions` list.
- `remember_device` is sent but the backend ignores it.
- Notification endpoints live in `connectionRequestService.js`.
- `/feedback` can submit an all-null response and shows no error on failure; its
  "Back to Connect" link points at the guarded `/members`.
- Some MetricCard initial-load flicker remains (cosmetic, admin-only).