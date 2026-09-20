# StudySync

**Academic collaboration, without the chaos.**

StudySync turns scattered course files into safe, actionable study sessions. It helps students understand collaboration rules, find compatible classmates, agree on a time, and choose a study space in one workflow.

## Features

- Real Supabase email/password registration, login, confirmation, persistent sessions, and logout.
- Protected pages and APIs with server-verified identity.
- Course creation, private PDF/text uploads, real AI material analysis with source quotes, and study-session drafts.
- Dropbox Chooser import integration (requires a Dropbox app key).
- Responsive dashboard, session calendar, attendance check-in, and past-session history.
- Long-term goals with linked study sessions, member Progress Sync, and saved Meta Group Sync Briefs.
- In-app start/end reminders while the app is open; these are not background push notifications.
- Study chat grounded in the signed-in user’s analyzed course materials for Study and Exam review sessions.
- Create, join, availability, session-detail, policy, room, and confirmation views.
- Full API contract for sessions, joining, availability, best-time calculation, and policy analysis.
- Mock repository and seeded demo data so frontend and database work can happen in parallel.
- Supabase/Postgres repository, migration, seed data, transactional RPCs, and Row Level Security.
- Deterministic matching and availability utilities with tests.
- OpenAI Responses API integration with Structured Outputs for material and policy analysis.

## Run locally

Run the commands below from this repository directory (the one containing `package.json`). Use Node.js 22+ and pnpm via Corepack; if your Node installation does not include Corepack, install it first.

```bash
corepack pnpm install
cp .env.example .env.local
```

Before starting the app:

1. Configure the Supabase URL, public anon/publishable key, and server-only service-role key in `.env.local`, with `DATA_BACKEND=supabase`.
2. Apply **all** files in `supabase/migrations/` in filename order, then `supabase/seed.sql`. Follow [the Supabase setup guide](./docs/SUPABASE.md) for email authentication and confirmation URLs.
3. Create the private course-material storage bucket:

   ```bash
   node --env-file=.env.local scripts/setup-course-storage.mjs
   ```

4. Configure the optional integrations below for the features you want to use, then start the app:

   ```bash
   corepack pnpm dev
   ```

Open [the login page](http://localhost:3000/login), register an account, and confirm your email before signing in. Restart the dev server after changing environment variables. Never commit `.env.local` or real credentials.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATA_BACKEND` | Use `supabase` for persistent application data; `mock` selects in-memory fixtures. |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for the server repository and browser/auth client. Set both to the same project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon/publishable key for Supabase Auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only repository and private storage access. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Material analysis, course-policy preview, and study chat; default model is `gpt-5-mini`. |
| `OPENAI_LIVE_MODE` | Controls the legacy policy-analysis service’s default live/mock behavior. It does **not** disable live material analysis, course-policy preview, or study chat. |
| `META_API_KEY` / `META_MODEL` | Group plans and Group Sync Briefs; default model is `muse-spark-1.3`. |
| `NEXT_PUBLIC_DROPBOX_APP_KEY` | Enables Dropbox Chooser after configuring its allowed domains. |
| `DEEPGRAM_API_KEY` | Enables opt-in voice practice. |

`DATA_BACKEND=mock` is for repository fixtures and tests. It does not bypass Supabase authentication or replace Supabase Storage, so it is not a credential-free browser demo. AI features require their respective provider keys; the core scheduling flow does not require AI keys.

### Development commands

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm start # serve a successful production build
```

Tests cover matching, availability, policy restrictions, membership and capacity, attendance, goals, group sync, and API authorization. Database workflow checks are also available in `supabase/tests/workflow_boundaries.sql` for a configured Supabase test project.

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
- [x] Mock repository fixtures and workflow tests
- [x] Supabase schema, seed data, repository, transactional writes, and RLS
- [x] Goal journeys, attendance/history, and group progress synchronization

## Two AI roles

OpenAI continues to analyze course materials and power study chat. Meta Muse Spark powers two session coordination flows: **Generate group plan** for standalone sessions (shared goals, an icebreaker, a discussion agenda, and voluntary roles), and **Group Sync Brief** for goal-linked sessions. Matching, scheduling, and session confirmation remain deterministic.

Set `META_API_KEY` in `.env.local` to your Meta Model API key and optionally set `META_MODEL` (default `muse-spark-1.3`), then restart the dev server. Keep the existing `OPENAI_API_KEY` and `OPENAI_MODEL`. Meta calls use `https://api.meta.ai/v1`; see the [Meta API documentation](https://dev.meta.ai/docs/overview). Deployments need the same server-side environment variables. Never use a NEXT_PUBLIC prefix for API keys.

Only signed-in session members can generate a plan or brief. For standalone group plans, the request sends member names, declared strengths and needs, session context, and course policy to Meta, without uploading source files or sending chat history. Standalone group plans are ephemeral drafts, visible only on the requesting page, and are not saved or accepted on anyone’s behalf. Assignment plans require an explicit policy allowing collaboration and discussion without an instructor-review flag. Missing credentials and provider failures show errors; they never silently switch providers.

For goal-linked sessions, every member first completes **Progress Sync** with their progress, today’s goal, preferred work style, and optional blocker. Meta receives these check-ins, member names, the linked goal, session context, and course policy to generate an agenda and personal wins. These briefs are saved through the repository and shown to session members; they remain drafts and do not change schedules or book rooms. Apply migrations through `202609200004_group_sync.sql` to enable this flow.

Room selection and confirmation record the group’s choice in StudySync; they do not reserve a room through a campus booking system. Demo rooms are labeled in the UI.

### Deepgram challenge: Speak to learn

Course pages now offer opt-in voice practice with Deepgram Voice Agent API:
- **Language conversation:** English role play, adaptive questions, and grammar feedback.
- **Any subject:** explain a concept aloud, answer follow-up questions, and receive hints.
- Live transcript, interruptible spoken replies, explicit start/end controls, and a 10-minute session limit.

Set `DEEPGRAM_API_KEY` in `.env.local` with a Member-or-higher Deepgram key, then restart the app. The authenticated `/api/courses/[id]/voice` endpoint exchanges the server key for a 30-second token; the permanent key never goes to the browser. Deepgram manages transcription, the configured hosted thinking model, and speech synthesis. This path does not require the app's OpenAI key. Use localhost or HTTPS for microphone access. Voice practice currently supports English; it does not assess pronunciation or read uploaded materials. StudySync does not persist audio or transcripts; audio is sent to Deepgram and its configured AI provider during practice.

Demo: open a course → choose Language conversation → start and role-play a conversation; then choose Any subject and explain a concept aloud. This provides an integration/demo narrative for a Deepgram challenge entry, not confirmation of eligibility or submission.

Reference: [Deepgram browser voice agent guide](https://developers.deepgram.com/docs/browser-agent-javascript)
