# StudySync

**Academic collaboration, without the chaos.**

StudySync turns scattered course files into safe, actionable study sessions. It helps students understand collaboration rules, find compatible classmates, agree on a time, and choose a study space in one workflow.

## What works in the framework

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

Open `http://localhost:3000`. The full mock demo works without external services or secrets.

Dependencies are already installed in the current workspace. If `node_modules` is removed later, restore dependencies with the repository package manager:

```bash
corepack pnpm install
```

To configure local environment values, copy `.env.example` to `.env.local`. Never commit real credentials. `OPENAI_LIVE_MODE=false` keeps policy analysis deterministic; live mode should be enabled only with a valid server-side key.

## Team integration

UI and API routes depend on the repository interface in `src/lib/data/contracts.ts`, not on Supabase directly. `DATA_BACKEND=mock` runs the zero-setup demo; `DATA_BACKEND=supabase` selects the persistent implementation without changing any page or API route.

Key documents:

- [Project plan and TODO](./PROJECT_PLAN.md)
- [Full-stack ownership and database handoff](./docs/FULLSTACK_OWNERSHIP.md)
- [Supabase setup and architecture](./docs/SUPABASE.md)

## Current status

- [x] Product direction defined
- [x] Dropbox, Meta, and OpenAI challenge alignment mapped
- [x] MVP scope and technical framework drafted
- [x] Application scaffold
- [x] Mock full-stack flow and API boundaries
- [x] Database handoff contract
- [x] Working mock end-to-end demo
- [x] Supabase schema, seed data, repository, transactional writes, and RLS
