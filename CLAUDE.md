# FamActify — AI Navigation

**Last updated:** 2026-04-25
**Owner:** Kaspars Zemitis
**What is FamActify:** App that helps busy Bay Area families discover, plan, and remember meaningful weekend activities with their kids. Tagline: "Every Saturday is a memory waiting to happen."

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
- ❌ Add Latvian translations for new v3.1 Bay Area features — English only for now
- ❌ Commit `.env` file — it contains Supabase keys
- ❌ Merge to `main` without Kaspars review

### Always do these:
- ✅ Mobile-first: write the mobile layout first, add `md:` / `lg:` breakpoints after
- ✅ Use `import { flags } from '@/lib/flags'` to gate unfinished features
- ✅ New Supabase tables go in `supabase/migrations/YYYYMMDD_HHMMSS_description.sql`
- ✅ New features get a doc in `docs/features/FEATURE-CODE.md` before or alongside code

---

## Routes at a Glance

| Path | Page | Auth | Status |
|------|------|:----:|--------|
| `/` | Landing.tsx | No | ⚠️ Needs rewrite (v3.1) |
| `/auth` | Auth.tsx | No | ✅ Working |
| `/home` | Home.tsx | ✅ | ✅ Working |
| `/onboarding/interests` | OnboardingInterests.tsx | ✅ | ✅ Working |
| `/onboarding/questions` | OnboardingQuestions.tsx | ✅ | ✅ Working |
| `/events` | Events.tsx | ✅ | ✅ Working (calls generate-recommendations) |
| `/saved-trips` | SavedTrips.tsx | ✅ | ✅ Working |
| `/pitch-deck` | PitchDeck.tsx | No | ⚠️ Needs rewrite (v3.1) |
| `/contribute` | Contribute.tsx | ✅ | ✅ Working |
| `/community` | CommunityActivities.tsx | No | ✅ Working |
| `/confirm` | ConfirmAttendance.tsx | No | ✅ Working |
| `/trip/:token` | SharedTrip.tsx | No | ✅ Working |

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

**v3.1** — 36 hours — see `docs/sprints/SPRINT-V3.1.md`

Priority order:
1. Feature flags ✅ (flags.ts created)
2. Analytics (Vercel Analytics)
3. Google auth redirect URLs (Supabase dashboard)
4. Activity seeding (Bay Area, 10-20 venues)
5. Pitch deck page rewrite
6. Landing page rewrite (ships last)

---

## Knowledge Base (outside repo)

Full product context in `~/knowledge/famactify/`:
- `famactify-notes.md` — product history, screenshots, V01/V02/V03 decisions
- `BERKELEY-PM-ANALYSIS.md` — framework analysis, what to build and why
- `FAMACTIFY-WORK-STRUCTURE.md` — full feature registry with dev status
- `BAY-AREA-STRATEGY.md` — David meeting, venue approach, 17-day plan
- `CODEBASE-ANALYSIS.md` — technical deep-dive
