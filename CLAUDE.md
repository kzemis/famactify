# FamActify — AI Navigation

**Last updated:** 2026-05-14
**Owner:** Kaspars Zemitis
**What is FamActify:** App that helps busy Bay Area families discover, plan, and remember meaningful weekend activities with their kids. Tagline: "Every Saturday is a memory waiting to happen."

**Recent sprints (read these before touching auth, citygames, or bottom nav):**
- [`AUTH-T0`](../../../knowledge/famactify/docs/sprints/AUTH-T0-tier-0-safety-and-honest-signup.md) — Honest signup + password reset + `/test-auth` removed. ✅ 2026-05-14
- [`AUTH-T0.5`](../../../knowledge/famactify/docs/sprints/AUTH-T0.5-soft-auth-gate-and-lock-icons.md) — Soft auth gate drawer + `?next=` flow + lock icons. ✅ 2026-05-14
- [`CITYGAMES-T1`](../../../knowledge/famactify/docs/sprints/CITYGAMES-T1-hero-rail-and-play-tab.md) — Play tab + citygames curation. ✅ 2026-05-14 (Option A rail removed post-ship)
- [`CITYGAMES-T1.1`](../../../knowledge/famactify/docs/sprints/CITYGAMES-T1.1-remove-banner-and-add-country-filter.md) — Remove legacy banner + country filter on `/play`. ✅ 2026-05-14
- [`HUNT-DETAIL-T1`](../../../knowledge/famactify/docs/sprints/HUNT-DETAIL-T1-hero-clamp-and-multiplayer-sheet.md) — Clamp hunt-detail hero to `55svh` + consolidate Duo/Race into a Multiplayer mode sheet. 🟡 Planned

---

## 🔴 Mandatory AI Workflow — Every Single Session

**Do this in order, no exceptions. Any AI agent (Claude, Codex, GPT-4) must follow this.**

### Start of session:
1. Read `~/knowledge/famactify/docs/genai/HANDOFF.md` — current state, what was done, what's next
2. Read `~/knowledge/famactify/docs/genai/AI-WORKFLOW.md` — full workflow rules
3. Read `~/knowledge/famactify/docs/sprints/SPRINT-V3.1.md` — active sprint task specs
4. Read `~/knowledge/famactify/docs/guidelines/CODING-GUIDELINES.md` before writing any code
5. For each feature you're about to build: read `~/knowledge/famactify/docs/features/FEATURE-CODE.md`

### During work:
6. After finishing a feature: **create or update** `~/knowledge/famactify/docs/features/FEATURE-CODE.md`
7. Keep `~/knowledge/famactify/FAMACTIFY-WORK-STRUCTURE.md` updated — dev status, sprint column, notes

### End of session:
8. Write session notes: `~/knowledge/famactify/docs/session_notes/YYYY-MM-DD-short-title.md` — 1:1 dump of everything that happened: user requests, decisions, files changed, errors fixed, pending items
9. Update `~/knowledge/famactify/docs/genai/HANDOFF.md` — what was done this session, what's next
10. **Commit all code changes** with a descriptive message

---

## Before You Touch Anything

1. **Active branch is `v03`** — all sprint work happens here. `main` is production baseline.
2. **Read `docs/sprints/SPRINT-V3.1.md`** before writing any code — it has exact task specs.
3. **Read `docs/guidelines/CODING-GUIDELINES.md`** — mobile-first Tailwind, TypeScript conventions, service layer pattern.
4. **Read `docs/guidelines/BACKEND-MIGRATION.md`** — code now must survive backend addition later. Use service layer. Don't call Supabase directly from pages.
5. **Check `docs/features/`** for the feature you're working on before building it.

---

## Stack

| | |
|--|--|
| Framework | React 18 + TypeScript + Vite (port 8080) |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| State | @tanstack/react-query (server), useState/context (local) |
| Backend now | Supabase (PostgREST + Auth + Storage + Edge Functions/Deno) |
| Backend future | Node.js / FastAPI — see `docs/guidelines/BACKEND-MIGRATION.md` |
| Email | Resend API via edge function `send-calendar-invite` |
| i18n | Custom LanguageContext — EN + LV strings in `src/i18n/translations.ts` |
| Feature flags | `src/lib/flags.ts` — `VITE_FF_*` env vars |

---

## Key Directories

```
src/
  pages/        ← One file per route (see App.tsx for all routes)
  components/   ← Shared UI components + shadcn/ui in components/ui/
  services/     ← DATA ACCESS LAYER — all Supabase/API calls go here, NOT in pages
  lib/
    flags.ts    ← Feature flags (import { flags } from '@/lib/flags')
    utils.ts    ← cn() helper + getFunctionsBaseUrl()
  integrations/supabase/
    client.ts   ← Supabase singleton (never import createClient directly)
    types.ts    ← Auto-generated DB types (do not edit manually)
  i18n/         ← LanguageContext + translations.ts
  hooks/        ← Custom React hooks
  assets/       ← Images: hero-family.jpg, team-kaspars-new.jpg, pattern-bg.jpg

supabase/
  migrations/   ← New SQL migrations go here with timestamp prefix
  functions/    ← Deno edge functions (generate-recommendations, send-calendar-invite, etc.)
  seeds/        ← Seed SQL files (Bay Area activities etc.)

# Docs are in the knowledge folder (internal, not codebase):
~/knowledge/famactify/docs/
  INDEX.md                         ← Start here for docs navigation
  guidelines/CODING-GUIDELINES.md  ← MUST READ before coding
  guidelines/BACKEND-MIGRATION.md  ← Service layer + RAG/vector/analytics roadmap
  sprints/SPRINT-V3.1.md           ← Active sprint task specs
  features/                        ← One doc per feature
  genai/CODEX-AGENT.md             ← Tasks for ChatGPT Codex
  genai/HANDOFF.md                 ← Session handoff context
  session_notes/                   ← Conversation summaries
```

---

## Critical Rules

### Never do these:
- ❌ Call `supabase.from(...)` directly inside a page component — use a service in `src/services/`
- ❌ Import `createClient` anywhere except `src/integrations/supabase/client.ts`
- ❌ Edit `src/integrations/supabase/types.ts` manually — it's auto-generated
- ❌ Add Latvian translations for new post-v3.1 features — English only for now (Bay Area, citygames, auth flows)
- ❌ Commit `.env` file — it contains Supabase keys
- ❌ Merge to `main` without Kaspars review

### Always do these:
- ✅ Mobile-first: write the mobile layout first, add `md:` / `lg:` breakpoints after
- ✅ Use `import { flags } from '@/lib/flags'` to gate unfinished features
- ✅ New Supabase tables go in `supabase/migrations/YYYYMMDD_HHMMSS_description.sql`
- ✅ New features get a doc in `docs/features/FEATURE-CODE.md` before or alongside code
- ✅ For ANY tap to a gated route, use `gateOrNavigate({ to, reason })` from `useAuthGate()` — not `navigate(...)`
- ✅ Email/OAuth `redirectTo` is `/auth` — never `/home`, never `/activities` (`<Navigate replace>` strips OAuth callback)
- ✅ `?next=` validation in Auth.tsx must use `safeNext` (only `/`-prefixed, not `//`) — open-redirect is CVE material

---

## Load-Bearing Patterns (2026-05-14)

After AUTH-T0 / AUTH-T0.5 / CITYGAMES-T1, these patterns are now non-negotiable. Full details in `~/knowledge/famactify/docs/genai/HANDOFF.md` "What shipped 2026-05-14" block.

### Auth callbacks
- **All auth flows funnel through `/auth`.** Google OAuth `redirectTo: ${origin}/auth`; email signup `emailRedirectTo: ${origin}/auth`; password reset `redirectTo: ${origin}/auth/reset-password`.
- **Listener handles both `SIGNED_IN` and `INITIAL_SESSION`** — Supabase v2 may process OAuth before the listener subscribes and surface it as INITIAL_SESSION.
- **Supabase Redirect URL allowlist** must include `/auth` + `/auth/reset-password` for both localhost and production.

### Soft auth gate
- Use `gateOrNavigate({ to, reason })` for taps leading to gated routes. Anonymous → drawer; signed-in → navigate.
- `ProtectedRoute` preserves `?next=<encoded-path>` for direct-URL access.
- Lock icons on bottom tabs only when `isAuthenticated === false` (not during loading).
- Provider mount order: `<BrowserRouter><AuthGateProvider><AuthGate /><AppShell>...</AppShell></AuthGateProvider></BrowserRouter>`.

### Citygames
- Filter: `host_name = 'FamActify Original'`. Canonical. Load-bearing.
- `huntsService.listCitygames(...)` is the only entry — don't write inline `.from('hunts').eq('host_name', ...)` calls.
- Seed: `supabase/migrations/20260510_120000_seed_citygames_v1_polished.sql` (Richmond/Oakland/Lake Merritt).

### Bottom nav
- 5 tabs in order: **Play / Activities / Plan / Trips / Me**.
- `Mode` tab dropped (route `/kids` still works).
- 6 tabs is a soft no — labels truncate at 360px.

### Don't
- ❌ Re-add `/test-auth` — it leaked the admin flow
- ❌ Re-add the "Remember me" checkbox — it never worked
- ❌ Add `redirectTo: ${origin}/home` for any auth flow — strips OAuth hash

---

## Routes at a Glance

**Auth column legend:**
- `No` = public, no auth required
- `Soft` = soft-gated via AuthGate drawer (anonymous tap opens "Sign in to …" drawer; ProtectedRoute also enforces at route level)
- `Yes` = hard-gated via ProtectedRoute (redirects anonymous to `/auth?next=<path>`)
- `Admin` = ProtectedRoute + AdminRoute (`profiles.is_admin = true`)

### Public routes

| Path | Page | Auth | Notes |
|------|------|:----:|-------|
| `/` | Landing.tsx | No | Landing page |
| `/auth` | Auth.tsx | No | 5-mode state machine: signin/signup/signup-confirm-sent/reset-request/reset-link-sent. Reads `?next=` with `safeNext` validation. ALL auth callbacks land here. |
| `/auth/reset-password` | ResetPassword.tsx | No | Guarded by Supabase `PASSWORD_RECOVERY` event |
| `/home` | redirect | No | `<Navigate to="/activities" replace />` — vestigial, drop in AUTH-T1 |
| `/activities` | CommunityActivities.tsx | No | Main discover/plan/map view. `?view=plan` for plan view. |
| `/play` | Play.tsx | No | Citygames list (filter `host_name = 'FamActify Original'`). First tab in bottom nav. |
| `/hunts` | Hunts.tsx | No | Full hunts catalog (broader than `/play`) |
| `/hunts/:slug` | HuntDetail.tsx | No | Hunt detail |
| `/hunts/:slug/play` | HuntPlay.tsx | No | In-progress hunt |
| `/kids` | KidModePage.tsx | No | Little Explorer mode (NOT in bottom tab bar anymore — reach via direct URL / AppHeader) |
| `/lists` | CuratedLists.tsx | No | Curated activity lists |
| `/lists/:slug` | CuratedListDetail.tsx | No | Curated list detail |
| `/generated-activities` | GeneratedActivities.tsx | No | AI-generated activities |
| `/confirm` | ConfirmAttendance.tsx | No | RSVP from email |
| `/trip/:shareToken` | SharedTrip.tsx | No | Shared trip view |
| `/events-calendar` | EventsCalendar.tsx | No | Public events calendar |
| `/cats` | CatComparison.tsx | No | Cat category comparison |
| `/kaspars` | KasparsPage.tsx | No | Personal demo page |
| `/pitch-deck`, `/about`, `/careers`, `/benefits`, `/faq`, `/contact`, `/terms`, `/privacy` | various | No | Marketing / legal (lazy-loaded) |

### Soft-gated routes (tab/menu-tap → drawer; direct URL → ProtectedRoute)

| Path | Page | Auth | Notes |
|------|------|:----:|-------|
| `/saved-trips` | SavedTrips.tsx | Soft | Bottom tab "Trips". Drawer reason: "save your trips" |
| `/profile` | Profile.tsx | Soft | Bottom tab "Me". Drawer reason: "see your profile" |

### Auth-required routes

| Path | Page | Auth | Notes |
|------|------|:----:|-------|
| `/onboarding/interests` | OnboardingInterests.tsx | Yes | |
| `/onboarding/questions` | OnboardingQuestions.tsx | Yes | |
| `/events` | Events.tsx | Yes | Calls generate-recommendations |
| `/itinerary` | Itinerary.tsx | Yes | |
| `/calendar` | Calendar.tsx | Yes | |
| `/contribute` | Contribute.tsx | Yes | Drawer reason: "contribute an activity" |
| `/passport` | Passport.tsx | Yes | Stamp book — drawer reason: "track your passport" |
| `/chores` | Chores.tsx | Yes | Parent home chores — drawer reason: "create home chores" |
| `/chores/new`, `/chores/edit/:slug` | ChoreEdit.tsx | Yes | |
| `/balance` | BalanceTracker.tsx | Yes | |
| `/plan/horizon` | LongHorizonPlanner.tsx | Yes | |
| `/race/create/:slug`, `/race/join`, `/race/:raceId/play`, `/race/:raceId/results` | RaceLobby/RacePlay/RaceResults | Yes | Multi-family live race |
| `/duo/host/:slug`, `/duo/join`, `/duo/:sessionId/play` | DuoLobby/DuoPlay | Yes | Two-phone parent+kid mode |
| `/org/setup`, `/org/dashboard`, `/org/lists/*`, `/org/hunts`, `/org/hunts/*` | various | Yes | Org admin pages |
| `/activities/:id/edit` | EditActivity.tsx | Yes | |

### Admin-only routes

| Path | Auth | Notes |
|------|:----:|-------|
| `/admin/lists`, `/admin/lists/*`, `/admin/activities-demo` | Admin | Curated list admin |
| `/admin/hunts`, `/admin/hunts/*`, `/admin/hunts/photo-review` | Admin | Hunt approval + photo review |

---

## Database Tables

| Table | What | RLS |
|-------|------|-----|
| `profiles` | User profile, auto-created on signup | Owner only |
| `activityspots` | Curated activity database | Public read, auth write |
| `activityspots_genai` | AI-generated (needs review) | Auth read, service insert |
| `saved_trips` | User's saved plans + calendar invites | Owner only + share_token public |
| `trip_confirmations` | RSVP from email links | Public update, owner read |
| `newsletter_subscriptions` | Email list | Public insert |
| `contact_submissions` | Contact form | Public insert |

Storage bucket: `activity-images` (public read/write)

---

## Edge Functions (call via getFunctionsBaseUrl())

| Function | What it does |
|----------|-------------|
| `generate-recommendations` | AI ranks activities for a family (reads Supabase + JSON + Bilesu API) |
| `send-calendar-invite` | Sends ICS email via Resend API |
| `generate-questions` | AI generates onboarding questions based on interests |
| `confirm-attendance` | Marks trip RSVP confirmed |
| `nominatim-proxy` | OpenStreetMap geocoding proxy |
| `parse-activity-info` | AI extracts structured data from free text |
| `get-discoverable-users` | Returns public profiles |

---

## Feature Flags

All in `src/lib/flags.ts`. Vite env vars: `VITE_FF_*`.

| Flag | Default | Feature |
|------|---------|---------|
| `editor_picks` | ON | Curated collections |
| `saturday_planner` | OFF | AI planner flow |
| `kid_explorer` | OFF | Kid-first browsing |
| `together_mode` | OFF | Involvement filter |
| `memory_loop` | OFF | Post-activity memory capture |
| `family_calendar` | OFF | Long-horizon planning |

---

## Active Sprint

**v3.1 is complete** (shipped over 2026-04-25 through 2026-05-06).

**Recently finished sprints (2026-05-14):**
1. **AUTH-T0** — safety + honest signup. ✅ Done
2. **AUTH-T0.5** — soft auth gate drawer + lock icons + `?next=` flow. ✅ Done
3. **CITYGAMES-T1** — Play tab + citygames curation. ✅ Done (Option A rail removed post-ship)

**Recently finished:**
- **CITYGAMES-T1.1** — removed legacy "City Games" banner from `/activities`, added `countryCode` filter to `listCitygames`, wired `country.code` in `Play.tsx` React Query key. ✅ 2026-05-14
- **HUNT-DETAIL-T1** — hero `max-h-[55svh]` clamp (CTA stack no longer clips on tall phones) + "Multiplayer mode" vaul Drawer replacing flat Duo/Race buttons + Family-squad "coming soon" placeholder. Config-agnostic Duo copy. ✅ 2026-05-15

**Future (signal-dependent):**
- **SCV-FAMILY-SQUAD-T1** — real 3+ phones same-team mode. Replaces the disabled "Coming soon" placeholder in the HuntDetail Multiplayer sheet. Needs new lobby UX, role assignment, multi-device sync model. Not planned yet — ship when Duo usage shows signal.

**Future sprints (not yet planned):**
- **AUTH-T1** — soft-gate Save/Heart/Add-to-passport; preserve `?next=` through Google OAuth; drop `/home`; onboarding → DB; `authService` consistency
- **AUTH-T2** — account deletion, parental consent, email change, admin grant UI
- **CITYGAMES-T2** — geolocation sort, filter chips, featured slot, analytics

---

## Knowledge Base (outside repo)

Full product context in `~/knowledge/famactify/`:
- `famactify-notes.md` — product history, screenshots, V01/V02/V03 decisions
- `BERKELEY-PM-ANALYSIS.md` — framework analysis, what to build and why
- `FAMACTIFY-WORK-STRUCTURE.md` — full feature registry with dev status
- `BAY-AREA-STRATEGY.md` — David meeting, venue approach, 17-day plan
- `CODEBASE-ANALYSIS.md` — technical deep-dive
