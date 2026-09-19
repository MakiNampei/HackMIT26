# Supabase backend

The persistent backend implements the same `StudySyncRepository` contract as the mock demo. Pages and route handlers do not import Supabase directly.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609190001_initial_schema.sql` in the SQL editor.
3. Run `supabase/migrations/202609190002_auth_profiles_and_permissions.sql`, then `supabase/migrations/202609190003_leave_session.sql`, followed by `supabase/seed.sql` in the SQL editor.
4. Copy `.env.example` to `.env.local` and set:

```dotenv
DATA_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

5. Restart `corepack pnpm dev` and open `http://localhost:3000`.

`SUPABASE_SERVICE_ROLE_KEY` is read only by server components and route handlers. Never prefix it with `NEXT_PUBLIC_`, commit it, or send it to the browser.

## Data and transaction boundaries

- `create_session_with_creator` creates a session and creator membership atomically.
- `join_session` locks the session row and enforces room capacity during concurrent joins.
- `leave_session` removes membership and availability atomically; groups below their minimum reopen and clear their confirmed time and room. Creators can leave while retaining historical creator attribution.
- `replace_availability` replaces one member's windows in one transaction.
- Best-time calculation runs deterministically in TypeScript after reading persisted windows.
- Room recommendations use capacity first and then choose the nearest suitable room.

The migrations enable RLS on all application tables and create profiles from Supabase Auth accounts. Server APIs verify the authenticated user, derive identity from the verified session, and use the server-only repository. Authenticated clients cannot bypass transactional RPCs by directly inserting memberships. Demo identities remain only in seed data.

## Switching back to mock data

Set `DATA_BACKEND=mock` or remove the variable. The mock path needs no external service or credentials.

## Email/password authentication

- `/register` creates an email/password account; `/login` signs in; Log out revokes the session. Protected pages and all data APIs require verified authentication.
- Enable Email in Supabase Authentication and set Site URL to the deployed app URL (locally `http://localhost:3000`). Keep email confirmation enabled. The default confirmation email verifies the email; users can then return to `/login`.
- Optionally use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` as the confirmation email link to sign in immediately after verification.
- Apply all migrations before using real accounts. Existing Auth users receive profiles during migration. Never paste service-role keys into chat or commit `.env.local`.
- Use `DATA_BACKEND=supabase` for real account data. Mock storage is only for seeded fixtures and service tests; it is not a persistence option for real accounts.

## Verification checklist

1. Register a new email, verify the message, then log in.
2. Refresh the dashboard and confirm your name is retained.
3. Create a session, then join it from a second account and save availability.
4. Log out; protected pages redirect to login and APIs return 401.
5. Verify a forged userId/creatorId never changes the acting user.
