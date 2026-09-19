# Supabase backend

The persistent backend implements the same `StudySyncRepository` contract as the mock demo. Pages and route handlers do not import Supabase directly.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609190001_initial_schema.sql` in the SQL editor.
3. Run `supabase/seed.sql` in the SQL editor.
4. Copy `.env.example` to `.env.local` and set:

```dotenv
DATA_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

5. Restart `corepack pnpm dev` and open `http://localhost:3000`.

`SUPABASE_SERVICE_ROLE_KEY` is read only by server components and route handlers. Never prefix it with `NEXT_PUBLIC_`, commit it, or send it to the browser.

## Data and transaction boundaries

- `create_session_with_creator` creates a session and creator membership atomically.
- `join_session` locks the session row and enforces room capacity during concurrent joins.
- `replace_availability` replaces one member's windows in one transaction.
- Best-time calculation runs deterministically in TypeScript after reading persisted windows.
- Room recommendations use capacity first and then choose the nearest suitable room.

The migration enables Row Level Security on every application table. The current hackathon demo calls Supabase from the server with a service-role key because the UI uses seeded identities such as `user-maki`. When Supabase Auth is added, profile IDs can use `auth.uid()::text`, and the existing authenticated policies apply without changing the domain types.

## Switching back to mock data

Set `DATA_BACKEND=mock` or remove the variable. The mock path needs no external service or credentials.
