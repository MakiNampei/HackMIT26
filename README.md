# StudySync

**Academic collaboration, without the chaos.**

StudySync turns scattered course files into safe, actionable study sessions. It helps students understand collaboration rules, find compatible classmates, agree on a time, and choose a study space in one workflow.

## What works in the framework

- Real Supabase email/password registration, login, confirmation, persistent sessions, and logout.
- Protected pages and APIs with server-verified identity.
- Course creation, private PDF/text uploads, real AI material analysis with source quotes, and study-session drafts.
- Dropbox Chooser import integration (requires a Dropbox app key).
- Responsive dashboard and session cards.
- Create, join, availability, session-detail, policy, room, and confirmation views.
- Full API contract for sessions, joining, availability, best-time calculation, and policy analysis.
- Mock repository and seeded demo data so frontend and database work can happen in parallel.
- Supabase/Postgres repository, migration, seed data, transactional RPCs, and Row Level Security.
- Deterministic matching and availability utilities with tests.
- OpenAI Responses API adapter with Structured Outputs, disabled by default in demo mode.

## Run locally

```bash
corepack pnpm dev
```

Open `http://localhost:3000/login`. Configure Supabase and apply all migrations following [the setup guide](./docs/SUPABASE.md) before registering real accounts.

Dependencies are already installed in the current workspace. If `node_modules` is removed later, restore dependencies with the repository package manager:

```bash
corepack pnpm install
```

To configure local environment values, copy `.env.example` to `.env.local`. Never commit real credentials. `OPENAI_LIVE_MODE=false` keeps policy analysis deterministic; live mode should be enabled only with a valid server-side key.

## Team integration

UI and API routes depend on the repository interface in `src/lib/data/contracts.ts`, not on Supabase directly. `DATA_BACKEND=mock` is retained for fixture-based development and tests; `DATA_BACKEND=supabase` selects the persistent implementation without changing any page or API route.

Key documents:

- [Project plan and TODO](./PROJECT_PLAN.md)
- [Full-stack ownership and database handoff](./docs/FULLSTACK_OWNERSHIP.md)
- [Supabase setup and architecture](./docs/SUPABASE.md)
- [Course materials and Dropbox setup](./docs/COURSE_MATERIALS.md)

## Current status

- [x] Product direction defined
- [x] Dropbox, Meta, and OpenAI challenge alignment mapped
- [x] MVP scope and technical framework drafted
- [x] Application scaffold
- [x] Mock full-stack flow and API boundaries
- [x] Database handoff contract
- [x] Working mock end-to-end demo
- [x] Supabase schema, seed data, repository, transactional writes, and RLS

## Two AI roles

OpenAI continues to analyze course materials and power study chat. Meta Muse Spark powers the session detail page’s **Generate group plan** button: shared goals, an icebreaker, a discussion agenda, and voluntary roles. Matching, scheduling, and session confirmation remain deterministic.

Set `META_API_KEY` in `.env.local` to your Meta Model API key and optionally set `META_MODEL` (default `muse-spark-1.3`), then restart the dev server. Keep the existing `OPENAI_API_KEY` and `OPENAI_MODEL`. Meta calls use `https://api.meta.ai/v1`; see https://dev.meta.ai/docs/overview. Deployments need the same server-side environment variables. Never use a NEXT_PUBLIC prefix for API keys.

Only signed-in session members can generate a plan. The request sends member names, declared strengths and needs, session context, and course policy to Meta, without uploading source files or sending chat history. Plans are ephemeral drafts, visible only on the requesting page, and are not saved or accepted on anyone’s behalf. Assignment plans require an explicit policy allowing collaboration and discussion without an instructor-review flag. Missing credentials and provider failures show errors; they never silently switch providers.
