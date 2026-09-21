# Kuzana Connect — Frontend

Next.js (App Router) client for **Kuzana Connect**, a member-discovery and
trusted-introduction network for the Kuzana community (Kenyan founders / SME
operators).

Members sign in with a WhatsApp OTP, build a profile describing what they offer
and what they are looking for, are shown proactively computed **suggestions** of
complementary members, and connect through a **double opt-in request flow**.
Contact details are never rendered until a request has been accepted — and the
API never sends them before that either, so this client is not the thing keeping
them secret.

This document is **self-contained**: everything needed to understand, run, and
work on the frontend is here. Product history lives in `master_context.md` in the
backend repo and is optional reading.

**Live:** `https://connect.kuzana.co` (Vercel). Backend: `https://api.kuzana.co`
(FastAPI on EC2, separate repo).

**Stack:** Next.js 16 (App Router, **plain JavaScript, no TypeScript**) · React 19
· Tailwind CSS v4 · Zustand · axios · lucide-react · libphonenumber-js.

---

## Table of contents

1. [How the app is put together](#1-how-the-app-is-put-together)
2. [Route map](#2-route-map)
3. [The API client: CSRF, 401 handling, single-flight refresh](#3-the-api-client-csrf-401-handling-single-flight-refresh)
4. [The auth + onboarding guard](#4-the-auth--onboarding-guard)
5. [State management (Zustand stores)](#5-state-management-zustand-stores)
6. [The service layer](#6-the-service-layer)
7. [Key user flows](#7-key-user-flows)
8. [Components](#8-components)
9. [Styling and design tokens](#9-styling-and-design-tokens)
10. [Environment variables](#10-environment-variables)
11. [Running locally](#11-running-locally)
12. [Deployment](#12-deployment)
13. [Conventions and gotchas](#13-conventions-and-gotchas)

---

## 1. How the app is put together

Everything lives under `src/app`. There is no `pages/` directory, no API routes,
and almost no server-side code: the app is a client-rendered SPA wearing the App
Router. Nearly every page file starts with `"use client"`.

```
src/app/
  layout.js                  root layout: fonts, global metadata, <Toaster/>
  globals.css                Tailwind v4 import + brand design tokens
  page.js                    public marketing landing page (server component)
  terms/ privacy/            public policy pages
  unsubscribe/page.js        public, token-based email opt-out
  feedback/page.js           public, token-based post-connection feedback form
  invite/[token]/            public invite landing (+ server-side OG metadata)
  welcome/page.js            post-verification "you're member #N" screen
  onboarding/page.js         2-step profile creation

  auth/
    login/page.js            phone -> OTP
    register/page.js         details + gate -> channel choice -> OTP
    verify/page.js           code entry, resend, channel switch

  (app)/                     ROUTE GROUP: everything behind the auth guard
    layout.js                the guard + AppShell wrapper
    members/page.js          suggestions + directory + search  (the home screen)
    members/[slug]/page.js   a member's profile
    profile/edit/page.js     edit own profile
    settings/page.js         email prefs + delete account
    connections/requests/    incoming + outgoing connection requests
    admin/                   admin area (layout + overview/users/connections/comms)

  lib/                       API service modules + small pure helpers
  store/                     Zustand stores
  components/
    app/                     feature components (shell, suggestions, requests…)
    auth/                    auth page chrome
    ui/                      generic primitives (Input, Button, ChipInput…)
    policy/                  policy page layout
```

Two structural decisions drive the rest:

**The `(app)` route group is the security boundary.** It is a parenthesised
group, so it adds no URL segment, but every route inside it shares
`(app)/layout.js`, which runs the auth check and the profile-completion check
before rendering anything. Anything that must be reachable while logged out
(landing, auth, invite, unsubscribe, feedback, policies) lives **outside** that
group.

**All server communication goes through `lib/api.js`.** Pages never call `axios`
or `fetch` against the API directly; they call a function in `lib/*Service.js`,
which uses one of the two shared axios instances. That is what guarantees CSRF
headers and token refresh are applied uniformly. (The two exceptions are
deliberate: `PhotoUpload.jsx` uses raw `fetch` to PUT to S3, which must *not*
carry our headers, and `invite/[token]/page.js` uses server-side `fetch` for
OpenGraph metadata before any session exists.)

---

## 2. Route map

| Route | Auth | What it does |
|---|---|---|
| `/` | public | Marketing landing page. A **server component** (the only substantial one) with its own metadata. |
| `/auth/login` | public | Phone entry → sends OTP → `/auth/verify`. |
| `/auth/register` | public | Two steps: details + gate, then delivery-channel choice. Creates the account and sends the OTP. |
| `/auth/verify` | public | Code entry, 60s resend cooldown, channel switching. Establishes the session. |
| `/welcome` | public route, post-session | Shows the new member number, then routes to onboarding. Self-redirects if already onboarded. |
| `/onboarding` | needs session | Two-step profile creation. Drafts to localStorage. |
| `/invite/[token]` | public | Validates an invite token, shows the inviter, routes to register. Generates OG metadata server-side so WhatsApp link previews show the inviter. |
| `/unsubscribe?token=` | public | Calls the backend's signed-token opt-out and renders the result. |
| `/feedback?token=` | public | Post-connection feedback form, linked from the day-5 nudge email. No login; the HMAC token identifies both members. |
| `/terms`, `/privacy` | public | Policy pages. |
| `/members` | guarded | **The home screen.** Suggestions on top, directory + search below. |
| `/members/[slug]` | guarded | A member profile. Slug is `name-membernumber`; only the trailing number is used for lookup. |
| `/profile/edit` | guarded | Edit own profile. |
| `/settings` | guarded | Email preferences, delete account. |
| `/connections/requests` | guarded | Received (accept/decline) and sent requests. |
| `/admin`, `/admin/users`, `/admin/connections`, `/admin/comms` | guarded + role | Admin area. |

`/onboarding` and `/welcome` sit **outside** the `(app)` group — a member who has
not completed a profile must be able to reach them, and they render their own
full-screen layout rather than the app shell.

---

## 3. The API client: CSRF, 401 handling, single-flight refresh

`src/app/lib/api.js` is the most important file in this repo. Read it before
changing anything auth-related.

### Two axios instances

```js
authRequest   // authenticated calls: injects CSRF, refreshes on 401, retries
publicRequest // pre-auth calls: register, send_otp, verify_otp, refresh, unsubscribe
```

Both are created with `withCredentials: true` so the browser sends and stores the
backend's cookies cross-origin. Base URL comes from `NEXT_PUBLIC_API_URL`,
defaulting to `http://localhost:8000/api/v1`.

### How auth actually works on the wire

The backend sets three cookies (see the backend README for full detail):

- `access_token_cookie` — HttpOnly, 15 minutes, JS cannot read it;
- `csrf_access_token` — **readable**, same value as the `csrf` claim inside the
  access JWT;
- `refresh_token_cookie` — HttpOnly, 30 days, scoped to `/api/v1/auth`.

Because the access token is HttpOnly, the client never handles it. What the
client *must* do is prove it can read same-site state, by echoing the CSRF cookie
back in an `X-CSRF-TOKEN` header. That is the double-submit pattern, and it is
the entire job of the request interceptor:

```js
authRequest.interceptors.request.use((config) => {
  let token = useAuthStore.getState().csrfToken;
  if (!token) {
    token = csrfFromCookie();                    // cookie fallback
    if (token) useAuthStore.getState().setCsrfToken(token);
  }
  if (token) config.headers["X-CSRF-TOKEN"] = token;
  return config;
});
```

**Why the cookie fallback exists:** on a fresh page load the Zustand store is
brand new. Without reading the cookie, the very first authenticated request would
go out with no CSRF header, 401, trigger a refresh, and retry — multiplying every
page load's request count and tripping the server's rate limiter. The store also
hydrates from the same cookie at creation (`authStore.js`), so in practice the
header is present from the first request; the interceptor fallback is the
belt-and-braces layer.

### Single-flight refresh — the important part

When the 15-minute access token expires, a page typically has several requests in
flight, and **all of them 401 at once**.

Refresh tokens rotate: every successful `GET /auth/refresh` retires the token it
was called with and issues a new one. Sequential refreshes are fine, because the
browser swaps in the new refresh cookie before the next call. **Overlapping
refreshes are fatal**: both were sent carrying the same pre-rotation cookie, the
backend rotates on the first, and the second is a replay of a retired token → 401
→ forced logout. That was the origin of the long-standing "random logout" bug.

The fix is to share exactly one refresh promise across every concurrent 401:

```js
let refreshPromise = null;

function runRefresh() {
  if (!refreshPromise) {
    const p = refreshSession();
    refreshPromise = p;
    p.finally(() => {
      setTimeout(() => {                        // MACROtask, deliberately
        if (refreshPromise === p) refreshPromise = null;
      }, 0);
    });
  }
  return refreshPromise;
}
```

**The `setTimeout` is not incidental.** A `.finally()` callback runs as a
*microtask*, the instant the refresh settles — which is *before* the
`await runRefresh()` inside the response interceptor resumes. Clearing the guard
there left a window in which a 401 arriving moments later saw
`refreshPromise === null` and started a second, overlapping refresh. Deferring
the reset to a macrotask lets every already-waiting caller resume off the same
promise first, so one token expiry produces exactly one rotation.

The backend complements this with a **15-second grace** on rotated-out tokens
(`ROTATION_GRACE_TTL`), so even a race that slips through is harmless. Both
halves are needed; do not remove either.

The response interceptor:

```js
if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
  originalRequest._retry = true;                       // refresh at most once per request
  const success = await runRefresh();
  if (success) {
    originalRequest.headers["X-CSRF-TOKEN"] = useAuthStore.getState().csrfToken;
    return authRequest(originalRequest);               // retry with the new token
  }
  handleAuthFailure();
}
```

The `_retry` flag matters because not every 401 is an expired token. A genuine
CSRF mismatch also 401s, and without the flag it would loop forever.

**`refreshSession` is private and deliberately not exported.** It is the raw
refresh that bypasses the single-flight guard. The only exported way to refresh
from outside this module is `refreshSessionShared()`, which routes through
`runRefresh()`. The `(app)` layout used to import the raw one directly, which is
precisely how it caused overlapping refreshes.

### Hard auth failure

`handleAuthFailure()` runs when a refresh genuinely fails:

1. **A 5-second timestamp window** collapses a burst of simultaneous failures
   into one redirect. It is a timestamp and not a boolean on purpose: a latched
   boolean never reset if the redirect did not actually complete (the user
   navigated away first, or a soft navigation kept the module alive), and every
   later genuine expiry then failed silently — no toast, no redirect, just dead
   requests.
2. `clearAuth()` on the store **and** `clearCsrfCookie()`. Without clearing the
   cookie, the dead CSRF value re-hydrates into a fresh store, so the first
   action on the login page (requesting an OTP) goes out with stale state and
   fails — the classic "it only works the second time" symptom.
3. A persistent warning toast, then a **full-page** `window.location.href`
   navigation to `/auth/login` after 1.2s. A hard navigation (not
   `router.push`) is used so module-level state — the refresh guard, the failure
   timestamp — is reset for the next session.

---

## 4. The auth + onboarding guard

`src/app/(app)/layout.js` guards every route in the group. On each mount:

```js
const authed = await checkAuthStatus();       // GET /auth/auth_check via authRequest
if (!authed) { clearAuth(); router.replace("/auth/login"); return; }

const me = await getMyProfile();              // GET /profiles/me
setStatus({
  isSearchable: !!me?.profile?.is_searchable,
  completionStatus: me?.profile?.completion_status || "pending",
  memberNumber: me?.user?.member_number ?? null,
  fullName: me?.user?.full_name || "",
});
```

Until both resolve, it renders a spinner rather than the page — so a guarded page
never flashes before the check completes.

**A `false` from `checkAuthStatus()` is terminal.** It goes through
`authRequest`, whose response interceptor has *already* attempted the shared
refresh and retried. Calling a refresh again here would be a second, unguarded
refresh that can overlap the interceptor's — which is the exact bug that caused
random logouts. If a manual refresh is ever needed here, use
`refreshSessionShared()`, never the raw one.

**Profile completion is enforced here, not per page.** Because the guard runs on
every `(app)` route load and writes `completionStatus` into
`profileStatusStore`, a member cannot URL-escape onboarding: any guarded route
re-evaluates it. Pages then read the store and render `LockedTeaser` themselves:

- `/members` overlays a blurred teaser over the directory (`variant="overlay"`);
- a member profile renders a full-page block (`variant="block"`) — unless it is
  the viewer's own profile, which is always viewable.

The **admin** area adds a second, separate check in `(app)/admin/layout.js`,
which fetches `/profiles/me` again and renders an access-denied panel unless the
role is `admin` or `super_admin`. This is purely cosmetic — the backend enforces
the role on every admin endpoint regardless. Its purpose is to avoid showing an
admin UI that would only produce 403s.

The admin **overview** (`(app)/admin/page.js`) renders `GET /admin/metrics` as
stat sections: Accounts, Connection activity, Invites, **Connection feedback**,
and Scheduled comms. Each section is conditional on its block being present in the
response, so an older backend simply omits the section rather than erroring. The
Connection feedback section reads `metrics.connection_feedback` and shows
responses, useful, reached-out, and average relevance — with `avg_relevance`
rendered as an em-dash when `null` (nobody has scored a match yet).

Note this means a guarded page load makes at least two requests
(`auth_check` + `profiles/me`), and `AppShell` independently fetches
`/profiles/me` a third time for the account menu.

---

## 5. State management (Zustand stores)

Five small stores in `src/app/store/`. There are no providers; Zustand is used
directly, and non-React modules read state with `useStore.getState()`.

### `authStore.js`
`{ role, csrfToken, memberNumber }` plus setters and `clearAuth()`.

`csrfToken` **initializes from the readable cookie** rather than `null`:

```js
csrfToken: readCsrfCookie(),
```

so the first authenticated request after any page load already carries the right
header, avoiding the 401 → refresh → retry churn described above. This is
deliberately *not* persisted middleware — the cookie is the persistence.

### `profileStatusStore.js`
`{ loaded, isSearchable, completionStatus, memberNumber, fullName }`. Written
once by the `(app)` guard, read by pages to decide whether to lock. Onboarding
and the edit page also write to it optimistically after a successful save, so the
UI unlocks without a refetch.

### `notificationStore.js`
The toast system (unrelated to the in-app notification bell, despite the name).
`notify(message, type, duration)` where type is
`success | error | warning | info`, duration in ms (default 4000, **`0` persists
until dismissed**). Timers are tracked in a module-level `timerMap` and cleared
on dismiss. Rendered by `<Toaster/>` in the root layout, so it works on every
page including public ones — which is how `api.js` can toast "Session expired"
from outside React.

### `searchStore.js`
Persists the full directory search snapshot (`q`, `direction`, `selIndustries`,
`location`, `deep`, `results`, `aiUsed`, `aiEnabled`) across navigation, so
opening a member profile and coming back does not lose the query, the filters, or
an expensive AI-expanded result set.

`hasSearched` is the flag that distinguishes "first mount, do the default load"
from "returning from a profile, restore instead of refetch".

### `connectionQuotaStore.js`
A minimal `{ version, bump() }` signal. Sending a request calls `bump()`; the nav
quota indicator watches `version` in a `useEffect` dependency and refetches. It
exists only to avoid prop-drilling a refresh callback across unrelated component
trees.

---

## 6. The service layer

Every backend call lives in `src/app/lib/*Service.js`. Components import these,
never axios.

| Module | Covers |
|---|---|
| `authService.js` | `checkInviteToken`, `register`, `verifyCommunityCode`, `sendOtp`, `verifyOtp`. Uses `publicRequest`. **`verifyOtp` is where the session is captured**: it writes `csrf_token`, `role`, and `member_number` into `authStore`. |
| `profileService.js` | Industries, MVP save, enrichment save, `getMyProfile`, `updateProfile`, `deleteAccount`, `getMember`, `searchMembers`, `getMembers`. |
| `suggestionService.js` | `getSuggestions`, `getMemberSuggestionsAdmin`. |
| `connectionRequestService.js` | Send/accept/decline, incoming/outgoing, quota — **and the notification bell endpoints** (they live here for historical reasons, not because they belong). |
| `endorsementService.js` | List, create, update, delete, `myEndorsementFor`. |
| `inviteService.js` | Create, list, update, cancel, `invitedBy`, `adminListUserInvites`, plus `inviteLink(token)` which builds the shareable URL from `NEXT_PUBLIC_SITE_URL`. |
| `adminService.js` | Metrics, users, connection requests, comms runs, suspend/activate/delete, set role. |
| `commsService.js` | Email prefs (auth), plus three **public** token-based calls: `unsubscribeByToken`, `verifyFeedbackToken`, and `submitFeedback`. The last three use `publicRequest`, since the HMAC token stands in for a session. |

Pure helpers, no network:

- **`slug.js`** — `slugify(name)` builds the cosmetic part of a profile URL;
  `memberNumberFromSlug(slug)` extracts the trailing number, which is the only
  part used for lookup (so `/members/anything-42` and `/members/real-name-42`
  resolve identically); `ensureUrl(url)` prepends `https://` to a bare domain, so
  a member typing `example.com` does not produce a link relative to our own site.
- **`vouch.js`** — shared vocabulary for invites and endorsements:
  `RELATIONSHIP_OPTIONS` (the canonical dropdown, with "Other" free-text on top
  in the forms), `LIMITS`, and the engagement-date helpers. Dates are now stored
  as a bare `"YYYY"`; `yearOf()` and `engagementPeriod()` accept legacy
  `"YYYY-MM"` rows too and render `2019 – 2022`, `2024`, or `2021 – Present`.
- **`pendingVerification.js`** — sessionStorage mirror of
  `{whatsapp_number, email, flow, channel}`, so `/auth/verify` survives the user
  leaving to WhatsApp and coming back, and survives a refresh.
- **`pendingInvite.js`** — sessionStorage mirror of the invite token. The URL
  query param is the source of truth (it survives refresh, new tabs, bookmarks);
  this fallback lets `/auth/register` distinguish "arrived with no invite" from
  "lost the query param during an in-app navigation".
- **`onboardingDraft.js`** — localStorage draft of the onboarding form, plus the
  exported `EMPTY` shape (see the hydration note in [gotchas](#13-conventions-and-gotchas)).
- **`logout.js`** — calls `GET /auth/logout` (revoking the refresh JTI
  server-side), clears the store, toasts, then hard-navigates to `/` after 500ms.
  Local cleanup happens even if the backend call fails.

---

## 7. Key user flows

### Registration

```
/invite/[token]  ──(valid)──►  /auth/register?invite=TOKEN
      │                              │
      └─(invalid/used/cancelled)     ├─ step "form":   details + gate
         explanatory screen          │    · invited  -> no code field
                                     │    · not invited -> community code field,
                                     │      validated via POST /auth/verify_code
                                     │      BEFORE moving on
                                     └─ step "confirm": choose WhatsApp or email
                                            │
                                            ▼
                                   POST /auth/register  (creates account, sends
                                   OTP by WhatsApp) [+ POST /auth/send_otp with
                                   channel="email" if email was chosen]
                                            │
                                            ▼
                                     /auth/verify
```

The register page resolves its invite token once on mount: query param wins, and
is mirrored into sessionStorage; otherwise it falls back to the mirror. While
resolving, `inviteToken === undefined` and the page renders `null` — avoiding a
flash of the wrong state.

Two client-side gates before the API is touched: all fields present, the phone
valid for the selected country (via `libphonenumber-js` in `PhoneInput`, stored
as E.164), and the Terms/Privacy checkbox ticked. The community code is then
validated on its own so a wrong code fails immediately, not after account
creation.

Choosing email does **not** change how verification works. The backend keys the
OTP by the phone number regardless of delivery channel; `register` always sends
by WhatsApp first and the email is a second send of a fresh code. If that second
send fails it is swallowed — the user still has the WhatsApp code and can resend.

### Verification and routing

`/auth/verify` reads `pendingVerification` (redirecting to `/auth/login` if
absent), runs a 60-second resend ticker, and offers a **channel switch**
(WhatsApp ↔ email) that re-sends to the other channel and resets the cooldown.

On success `verifyOtp` stores the session material, and the page routes on
`onboarding_status`:

```js
if (res.onboarding_status === "not_started") router.replace("/welcome");
else                                          router.replace("/members");
```

`/welcome` shows "Member #N" from the store, then sends the member to
`/onboarding`. It also re-checks `/profiles/me` and silently redirects an
already-onboarded member to their profile, so the screen cannot be revisited by
direct navigation.

### Login

`/auth/login` is just a phone field → `POST /auth/send_otp` → `/auth/verify` with
`flow: "login"`. Same verify screen, same session establishment.

### Onboarding

Two steps in one page (`onboarding/page.js`).

**Step 1 (required fields)** → `POST /profiles/mvp`: title, location, ≥1
industry, ≥1 offering, ≥1 "looking for", optional business name and intro, plus
the two contact toggles. Saving makes the member searchable and triggers the
backend's suggestion computation. "Save & exit" saves and goes straight to
`/members`.

**Step 2 (optional)** → `POST /profiles/enrichment`: photo, primary link,
LinkedIn. "Finish" routes to `/members?from=onboarding`.

**The contact nudge is warn-once, not a block.** If no contact channel is
selected, the first Continue/Finish shows an amber notice and stops; a second
click proceeds. Adding any channel clears the warning. Deliberate product
decision: a member may legitimately choose to be reachable only via a public
link, or not at all, with informed consent. Step 1 counts only the two toggles;
step 2 also counts a primary link or LinkedIn.

**Draft persistence:** every edit is written to localStorage, but the form
initializes from the exported `EMPTY` constant and merges the draft in a
post-mount `useEffect`, gated by a `hydrated` flag. Loading localStorage during
initial state would make the first client render differ from the server HTML and
break hydration; the flag also stops the empty default from overwriting a real
saved draft on first render. The draft is cleared on successful completion.

### Directory, search, and suggestions (`/members`)

The home screen stacks `SuggestionsSections` (the primary value) above the
directory and search box.

`fetchPage()` dispatches on whether there is a query: `searchMembers` (with
`direction`, filters and the `deep` flag) or `getMembers` (browse). Notable
behaviour:

- **Infinite scroll** via an `IntersectionObserver` on a sentinel with a 300px
  `rootMargin`. Appended pages are **deduped by `member_number`**, because the
  observer can fire twice or newly inserted rows can shift page offsets, which
  would otherwise produce duplicate React keys.
- `hasMore` is `!aiUsed && results.length < total` — AI-expanded results are
  deliberately not paginated further, since the expanded query is not stable
  across pages.
- **`userChangedRef`** distinguishes a filter change the user made from the
  initial mount. On first mount with a restored search (`hasSearched`), the page
  restores from `searchStore` instead of refetching; any user-driven change runs
  a fresh search.
- The "Try a wider search" button (shown only when `ai_enabled`) re-runs with
  `deep=true`, forcing AI expansion instead of waiting for a zero-result
  fallback.

`SuggestionsSections` renders **one ranked list**, not a buy/sell split. Each
card shows the person plus a one-line "why", picked client-side as the strongest
reason by `w * sim`:

```js
top.direction === "needs" ? `They offer ${theirs}` : `They're looking for ${theirs}`
```

Only the *other* member's side is asserted, because phrasing it as "you need X"
was sometimes inaccurate.

It also handles the post-edit case: `/profile/edit` sets
`sessionStorage["kc_profile_just_updated"]` on save, and this component reads and
clears that flag once, shows an "Updating your suggestions…" note, and refetches
after 5 seconds — long enough for the backend's background recompute (one LLM
call plus one embedding call) to finish.

### Member profile (`/members/[slug]`)

Parses the trailing number out of the slug, then fetches the member and
`/profiles/me` in parallel (the latter to determine self, name, and admin role),
plus `invitedBy(member.user_id)` for the permanent "invited by" line.

It renders one of three states:

1. **Not found / bad slug** → a "Member not found" panel.
2. **`profile_complete === false`** — an active member who joined but has not
   onboarded. Shows identity, member number, who invited them, and the
   endorsements they have received (for a just-joined member, that is the seeded
   vouch from their inviter). Nothing else: no offers, no contacts, no endorse
   action.
3. **Full profile** — identity, gated contacts, intro, industries, offers,
   looking-for, then endorsements, then (own profile only) suggestions and
   invites.

**Contact gating in the UI** mirrors the API exactly, and is driven by fields the
API computes:

| condition | rendered |
|---|---|
| own profile or `is_connected` | `ReachOutBlock` with real contacts |
| `request_status === "pending"` | a disabled "Request pending" state; the compose form never reopens |
| otherwise | the **Connect** button → `ConnectRequestModal` |

`primary_link` is always shown (it is a public showcase link). WhatsApp, email,
and LinkedIn only ever arrive in the payload once connected — this client is not
hiding anything it has.

`ReachOutBlock` builds a prefilled first message ("Hi {their first name}, I'm
{your name}…"), a `wa.me` deep link with the message URL-encoded, and a `mailto:`
with subject and body. On **your own** profile it instead shows the channels
others will see, so you can confirm how you are reachable.

### Connection requests

From a profile, `ConnectRequestModal` composes a ≤500 character intro, shows
remaining quota, disables sending at zero, and on success bumps
`connectionQuotaStore` and flips the parent's `request_status` to `pending`
locally.

`/connections/requests` shows Received and Sent tabs (`ConnectionRequests`).
Accepting toasts "You're connected with X" and, if the API returns
`i_have_no_contact`, adds a second toast nudging the accepter to add a contact
channel. Both tabs update optimistically in place rather than refetching.

### Settings and unsubscribe

`/settings` holds account-level concerns, deliberately separate from profile
*content* (which is `/profile/edit`): the `EmailPrefToggle` (optimistic, reverts
on failure) and account deletion behind a `ConfirmModal`, which on success calls
`deleteAccount()` then `logout()`.

`/unsubscribe?token=` is public and lives on the frontend rather than linking
emails straight at the API — that keeps the destination same-origin for the user
and avoids a bare JSON response in their browser. It renders `working`, `done`,
or `invalid`.

### Post-connection feedback (`/feedback?token=`)

The backend sends two follow-up emails to the person who made a connection: a
day-2 "have you reached out yet" nudge, and a day-5 "how did it go" nudge. The
second links here.

The page is **public and has no session**. The `token` query param is an
HMAC-signed `{rater}.{other}.{sig}` triple minted by the backend's nudge job, and
it identifies both members — so the form knows who is rating whom without a login
and without exposing either id as something meaningful to the user.

It is a four-state machine driven by one effect:

```
loading ──► verifyFeedbackToken(token)
              ├─ { ok: true }  ──► ready    (render the form, greet with other_name)
              └─ otherwise     ──► invalid  ("This feedback link is invalid or has expired")
ready ──► submitFeedback(...) ──► done      ("Thank you", link back to /members)
```

No token at all short-circuits straight to `invalid`.

The form collects four things, all optional, as pill buttons plus a textarea:

| field | values | sent as |
|---|---|---|
| Did you reach out? | Yes / Not yet | `reached_out: true \| false` |
| Was the connection useful? | Yes / Not yet / No | `useful: "yes" \| "not_yet" \| "no"` |
| How relevant was the match? | 1–5 | `relevance_score` |
| Anything to add? | free text, `maxLength 500` | `note` (trimmed, `null` when empty) |

**Nothing is required and there is no validation before submit** — the button is
live from the moment the form renders, so a member can submit an entirely empty
response. That is a deliberate low-friction choice, but it does mean the backend
can store all-null rows. The `'yes' | 'not_yet' | 'no'` vocabulary is enforced
only by these buttons; the API accepts any string.

On a failed submit the page silently clears `saving` and stays on the form — no
toast, no error message. Worth knowing when debugging a report of "the button
does nothing".

Because it lives outside `(app)`, it renders its own standalone card layout with
the Kuzana wordmark rather than `AppShell`, and it is wrapped in `<Suspense>` for
`useSearchParams`, like `/unsubscribe`.

### Photo upload

`PhotoUpload.jsx` does the whole presigned flow client-side:

1. resize to a max 512px dimension and convert to WebP via a canvas
   (`quality 0.85`);
2. `GET /profiles/photo/presign?content_type=image/webp` through `authRequest`;
3. **raw `fetch` PUT** straight to S3 with `Content-Type: image/webp` — no
   credentials, no CSRF header, because the signature is what authorizes it and
   extra headers would break it;
4. hand the returned `public_url` back to the form.

The API never sees the image bytes.

---

## 8. Components

### `components/app/` (feature)

| Component | Role |
|---|---|
| `AppShell.jsx` | The authed chrome: sticky header with logo, `ConnectionQuota`, `NotificationBell`, and an account menu (My profile, Connection requests, Settings, Admin when the role allows, Log out). Wraps content in a `max-w-5xl` main. |
| `SuggestionsSections.jsx` | The ranked suggestion list. `compact` for profile pages; `userId` + `admin` for the admin debug view. |
| `ConnectRequestModal.jsx` | Compose and send a request; shows and enforces quota. |
| `ConnectionRequests.jsx` | Received/Sent tabs with accept and decline. |
| `NotificationBell.jsx` | Unread badge polled every 60s; opening loads the last 20 and marks all read. `request_accepted` routes to the actor's profile (built from the actor's member number), everything else uses the stored `link`. |
| `ConnectionQuota.jsx` | Quiet "N left" pill in the nav; refetches when `connectionQuotaStore.version` changes. |
| `LockedTeaser.jsx` | Profile-incomplete gate; `overlay` over the directory, `block` for a whole page. |
| `EndorsementsSection.jsx` | Received/given endorsements, with create/edit/delete when `can_edit`. |
| `InvitesSection.jsx` | Create, list, edit, cancel invites; copyable share links. Exposes `openForm()` via ref so the profile header's Invite button can open it. |
| `VouchForm.jsx` | The shared form for invite and endorsement vouches (relationship, remarks, engagement years). |
| `ReachOutBlock.jsx` | Contact CTAs plus the copyable suggested first message. |
| `EmailPrefToggle.jsx` | Scheduled-email opt-out. |

### `components/ui/` (generic)

`Button` (variants + loading), `Input`, `ChipInput` (the add-one-then-press-+
control behind offerings and looking-for), `IndustryChips`, `PhoneInput`
(country selector + libphonenumber validation, emits E.164), `PhotoUpload`,
`ProgressBar`, `ConfirmModal`, `Logo`, and `Toaster` (the toast host, mounted
once in the root layout).

`components/auth/` holds `AuthShell` (centered card with title/subtitle/footer)
and `AuthTabs` (login ↔ register). `components/policy/PolicyLayout.js` wraps the
terms and privacy pages.

---

## 9. Styling and design tokens

Tailwind **v4**, configured through CSS rather than a JS config file: there is no
`tailwind.config.js`. `globals.css` imports Tailwind and declares the brand
tokens, and `postcss.config.mjs` wires up `@tailwindcss/postcss`.

Brand colours appear as `brand-navy`, `brand-blue` (+ `-50/-600/-700`),
`brand-yellow` (+ `-50/-100/-text`), `brand-ink`, `brand-red`. Use those rather
than raw hex. The email templates in the backend hard-code the same palette
independently (`services/email.py`), so a rebrand means changing both.

Everything is mobile-first — the community lives on WhatsApp and most traffic is
phone-sized. Icons are `lucide-react`; the font is Inter via `next/font/google`.

The app is installable as a PWA (`public/manifest.json`, icons, and
`appleWebApp` metadata in the root layout) but there is **no service worker**, so
there is no offline support or caching layer.

---

## 10. Environment variables

Only two, both public by definition (`NEXT_PUBLIC_` is inlined into the client
bundle at build time — never put a secret here).

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | `lib/api.js`, `invite/[token]/page.js` | Backend base URL, **including the `/api/v1` suffix** and no trailing slash. |
| `NEXT_PUBLIC_SITE_URL` | `https://connect.kuzana.co` | `inviteService.inviteLink`, invite OG metadata | This app's own public origin. Used to build shareable invite links and absolute OG URLs. In `inviteLink` it falls back to `window.location.origin`. |

The committed `.env` only sets `NEXT_PUBLIC_SITE_URL`, so local development
relies on the `NEXT_PUBLIC_API_URL` default pointing at `localhost:8000`.

Changing either requires a **rebuild**, not just a restart — `NEXT_PUBLIC_*`
values are baked in at build time.

---

## 11. Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

The backend must be running at `http://localhost:8000` (or set
`NEXT_PUBLIC_API_URL`). Because cookies drive auth, a few things matter in dev:

- The backend must have `ENV` **not** set to `production`, so cookies are issued
  `SameSite=lax` and work over plain HTTP on localhost. With
  `ENV=production` locally, the browser silently drops the cookies and you appear
  logged out immediately after logging in.
- The backend's `CORS_ORIGINS` must include `http://localhost:3000` exactly, with
  no trailing slash.
- Use `localhost` consistently. Mixing `127.0.0.1` and `localhost` between the
  two servers gives you two cookie jars.

To get through the OTP screen locally, read the code from the backend's console
(it prints `Generated OTP for …`) — Twilio is stubbed unless `TWILIO_LIVE=1`. You
also need the backend's `COMMUNITY_ACCESS_CODE` value to register without an
invite.

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint (flat config, eslint-config-next)
```

Path alias: `@/*` → `./src/*` (`jsconfig.json`), so imports read
`@/app/lib/api`.

---

## 12. Deployment

Deployed on **Vercel** at `connect.kuzana.co`, building from the default branch.
`next.config.mjs` is intentionally empty — there is no custom build
configuration.

Deployment checklist:

1. Set `NEXT_PUBLIC_API_URL=https://api.kuzana.co/api/v1` and
   `NEXT_PUBLIC_SITE_URL=https://connect.kuzana.co` in the Vercel project (they
   are baked in at build time, so changing them requires a redeploy).
2. Confirm the backend's `CORS_ORIGINS` contains the exact frontend origin and
   that the backend runs with `ENV=production` so cookies are
   `Secure; SameSite=None`.

**If the app logs in and then immediately behaves as logged-out in production,
the cause is almost always one of those two settings**, not the client code.

`push.sh` at the repo root is a convenience: `git add . && git commit && git push`.

---

## 13. Conventions and gotchas

**JavaScript, not TypeScript.** Do not introduce `.ts`/`.tsx`; the project has no
TypeScript toolchain configured.

**`AGENTS.md` (aliased by `CLAUDE.md`) warns that this Next.js version has
breaking changes** relative to older conventions, and asks you to read the
relevant guide under `node_modules/next/dist/docs/` before writing code. One
visible consequence: dynamic route params are a **Promise** — `invite/[token]`
does `const { token } = await params;`.

**`useSearchParams` requires a Suspense boundary** in the App Router. Pages using
it (`/auth/register`, `/unsubscribe`, `/feedback`) split into an inner component
wrapped in `<Suspense>`. Forgetting this breaks the build, not just runtime.

**Never render a FastAPI error object directly.** Validation errors arrive as
`detail: [{type, loc, msg, …}]` while other errors are `detail: "string"`.
Rendering the array throws React's "Objects are not valid as a React child". Use
the `errorMessage(err)` helper pattern (in `onboarding/page.js` and
`profile/edit/page.js`), which resolves string, array-first-`msg`, then
`message`, then a fallback.

**Hydration: never read browser storage during initial state.** Server and client
must render identically. Load localStorage in a post-mount `useEffect` behind a
`hydrated` flag, as onboarding does with `EMPTY`.

**Never import the raw `refreshSession`.** It is not exported for exactly this
reason. Use `refreshSessionShared()` if you truly need to refresh outside the
interceptor.

**The profile URL slug is cosmetic.** Only the trailing number is parsed, so any
name prefix resolves. Do not build logic that depends on the slug text.

**Bare URLs need `ensureUrl`.** A member typing `example.com` produces a link
relative to our own site unless run through it. Both the profile page and `slug.js`
carry a copy of this helper.

**Toast durations:** `0` means persist until dismissed. Used for session-expired
warnings; use it sparingly.

**Suspended or deleted members disappear from lists** because the backend filters
them, not because the client does. Do not add client-side filtering that
duplicates this — you will hide legitimate incomplete-profile members, which the
API deliberately returns with `profile_complete: false`.

### Known inconsistencies in the current code

Observed while reading the code, listed so they are not mistaken for intent:

- **`suggestionService.js`'s doc comment is stale.** It describes a response of
  `{can_help, needs_me, has_offers, has_needs}`. The backend returns a single
  `{suggestions, has_offers, has_needs}` list, which is what
  `SuggestionsSections` actually reads. The comment describes a removed two-section
  design.
- **`remember_device`** is collected by the verify screen's checkbox and sent to
  `POST /auth/verify_otp`, but the backend accepts and ignores it. The checkbox
  currently has no effect.
- **`/feedback` can submit an empty response.** No field is required and the
  submit button is never disabled for validation, so tapping Submit immediately
  stores a row with every field `null`.
- **A failed feedback submit shows nothing.** The `catch` only resets `saving`,
  leaving the user on the form with no error state and no toast.
- **The feedback page's "Back to Connect" link points at `/members`**, which is
  guarded — a logged-out member who followed the email link lands on the login
  redirect rather than anything useful.
- **Notification endpoints live in `connectionRequestService.js`**, not a
  notification service. Harmless, but not where you would look for them.
- **`/profiles/me` is fetched up to three times per guarded page load** — once by
  the `(app)` guard, once by `AppShell`, and once more by pages that need role or
  name (member profile, admin layout). An obvious consolidation target: the guard
  already stores `memberNumber` and `fullName`, but not `role`.
- **`AppShell` imports `useNotificationStore` and `notify`** without using them.
- **`searchStore.reset()` does not reset `direction`**, while `save()` writes it —
  so clearing a search keeps the last direction. Possibly intended, but it is
  asymmetric with the other fields.
- **The members page reads `saved.total` and `saved.page`** from `searchStore`,
  but those keys are not declared in the store's initial state (they are only
  added by `save()`), so they are `undefined` until the first search.
