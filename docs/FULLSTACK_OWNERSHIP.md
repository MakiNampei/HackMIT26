# Full-stack ownership - your scope

This is the implementation boundary agreed with the database/backend teammate. The goal is to let both people work in parallel without waiting on each other.

## You own

- Next.js application scaffold, routing, shared layout, and responsive UI.
- Dashboard and browse-sessions experience.
- Create Session form and validation feedback.
- Join Session interaction.
- Availability input UI and best-time result UI.
- Session detail, academic-policy result, room recommendation, and confirmation screens.
- Temporary demo-user flow now; Supabase Auth integration later.
- API route contracts and full-stack integration.
- OpenAI policy-analysis adapter, safe fallback, error states, and result presentation.
- Loading, empty, validation, ambiguity, and failure states.
- Vercel configuration, end-to-end demo flow, README, and pitch/demo assets.

## Teammate owns

- Supabase schema, migrations, relationships, constraints, and seed data.
- Supabase-backed implementation of `StudySyncRepository`.
- Persistent session CRUD and join logic.
- Participant and availability storage.
- Availability-overlap and matching algorithms, with tests.
- Room data/recommendation logic.
- Database permissions and Row Level Security.

## Shared contract

Both sides code against `src/lib/data/contracts.ts`. Your UI and API routes must not call Supabase directly. The teammate should implement the `StudySyncRepository` interface and replace the export in `src/lib/data/repository.ts`.

In mock mode, a successful create request navigates to the stable seeded demo because Route Handlers and Server Components do not share durable in-memory state. Once Supabase is connected, set `DATA_BACKEND=supabase`; the API will navigate to the newly persisted session ID.

Minimum handoff functions:

```ts
listCourses()
listSessions(filters)
getSession(id)
createSession(input)
joinSession(sessionId, userId)
submitAvailability(sessionId, userId, slots)
calculateBestTime(sessionId)
```

## First milestone

The framework is considered connected when this path works against Supabase without changing page components:

```text
Dashboard
-> Create Session
-> Join Session
-> Submit Availability
-> Calculate Best Time
-> Review Policy
-> Confirm Session
```

## Integration checklist

- [x] Shared TypeScript domain types exist.
- [x] Repository interface exists.
- [x] Mock repository unblocks UI work.
- [x] Frontend pages call stable API routes.
- [ ] Teammate adds `supabase-repository.ts`.
- [ ] Add Supabase environment variables locally.
- [ ] Swap the repository provider.
- [ ] Run API contract tests against Supabase.
- [ ] Verify the full demo after a cold restart.
