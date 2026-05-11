# Fullstack App Template

Template này dùng cho dự án web/app thật sự có nhiều page, backend riêng, database rõ ràng, auth, migration và deploy production.

## When To Use

Dùng template này khi app cần:

- Nhiều page/module thực sự.
- User account, role, permission.
- Database có schema rõ ràng.
- CRUD nhiều entity.
- API backend riêng.
- Migration/versioning database.
- Deploy production/staging.
- Log, monitoring, backup.

Nếu chỉ là tool cá nhân deploy GitHub Pages, dùng `STATIC_APP_TEMPLATE.md` là đủ.

## Recommended Stack Options

Chọn một stack ngay từ đầu, đừng trộn quá nhiều.

Option A: Simple fullstack TypeScript

```text
Frontend: React / Next.js
Backend: Next.js API routes hoặc Express/Fastify
Database: PostgreSQL
ORM: Prisma
Auth: Auth.js / Clerk / custom JWT
Deploy: Vercel + Supabase/Neon
```

Option B: Backend-first

```text
Frontend: React/Vue/Svelte
Backend: NestJS / Express / Fastify
Database: PostgreSQL
ORM: Prisma / Drizzle
Auth: JWT + refresh token hoặc session cookie
Deploy: Docker + VPS/Fly.io/Render
```

Option C: Laravel/Rails style

```text
Backend + views: Laravel / Rails / Django
Database: PostgreSQL/MySQL
Auth: Framework built-in
Deploy: VPS/Docker/PaaS
```

## Folder Structure

Generic structure:

```text
project-root/
  apps/
    web/
      src/
        app/
        components/
        features/
        lib/
        styles/
    api/
      src/
        modules/
        routes/
        services/
        repositories/
        middlewares/
        validators/
  packages/
    shared/
      src/
        types/
        validators/
  prisma/
    schema.prisma
    migrations/
  docs/
    ARCHITECTURE.md
    DATABASE.md
    API.md
    DEPLOYMENT.md
  .env.example
  README.md
  AI_AGENT.md
  FULLSTACK_APP_TEMPLATE.md
```

For smaller projects:

```text
project-root/
  src/
    app/
    components/
    features/
    server/
      routes/
      services/
      repositories/
      db/
  prisma/
  docs/
  .env.example
```

## Required Docs

Every serious project should have these:

- `README.md`: how to install, run, test, deploy.
- `docs/ARCHITECTURE.md`: modules, boundaries, request flow.
- `docs/DATABASE.md`: tables, relationships, indexes, migration notes.
- `docs/API.md`: endpoint contracts.
- `docs/DEPLOYMENT.md`: env vars, hosting, backup, rollback.
- `.env.example`: all required variables without secrets.
- `AI_AGENT.md`: project-specific AI instructions.

## Architecture Rules

Use clear layers:

```text
Route/Controller -> Service -> Repository -> Database
```

Responsibilities:

- Route/controller: parse request, auth guard, call service, return response.
- Service: business logic, permission checks, transactions.
- Repository: DB queries only.
- Validator/schema: request and response shape.
- UI feature: page state, form, API calls, user flow.

Avoid:

- Querying DB directly from random UI/server files.
- Business rules inside React components.
- Duplicated validation scattered across files.
- Large shared “utils” dumping ground.

## Database Design

Always define schema before building UI.

Each table should answer:

- What entity does this represent?
- Who owns this row?
- Which fields are required?
- Which fields are unique?
- Which fields are indexed?
- Should rows be soft-deleted?
- Does it need audit columns?

Baseline columns:

```sql
id uuid primary key
created_at timestamp not null
updated_at timestamp not null
deleted_at timestamp null -- only if soft delete is needed
```

Ownership columns:

```sql
user_id uuid not null
team_id uuid null
organization_id uuid null
```

Indexes:

- Index foreign keys.
- Index columns used for filters/sorts.
- Add compound indexes for common queries.
- Avoid premature indexes on low-cardinality booleans.

## Example Database Schema

Example learning app:

```text
users
  id
  email
  display_name
  created_at
  updated_at

study_spaces
  id
  owner_id -> users.id
  name
  created_at
  updated_at

decks
  id
  study_space_id -> study_spaces.id
  title
  description
  language
  created_at
  updated_at

flashcards
  id
  deck_id -> decks.id
  front_text
  back_text
  pronunciation
  metadata jsonb
  created_at
  updated_at

study_sessions
  id
  user_id -> users.id
  deck_id -> decks.id
  mode
  started_at
  completed_at

study_answers
  id
  session_id -> study_sessions.id
  flashcard_id -> flashcards.id
  is_correct
  answer_text
  created_at
```

Prisma style:

```prisma
model Deck {
  id          String      @id @default(uuid())
  title       String
  description String      @default("")
  language    String
  cards       Flashcard[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([language])
}

model Flashcard {
  id            String   @id @default(uuid())
  deckId        String
  deck          Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  frontText     String
  backText      String
  pronunciation String?
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([deckId])
}
```

## Migration Rules

Never edit production database manually without a migration plan.

Rules:

- Every schema change must have a migration.
- Migration must be committed.
- Destructive changes need backup and rollback plan.
- Backfill scripts should be idempotent.
- Large table migration should be staged:
  1. Add nullable column.
  2. Backfill.
  3. Deploy code using it.
  4. Make column required later.

## API Design

Use consistent resource routes:

```text
GET    /api/decks
POST   /api/decks
GET    /api/decks/:deckId
PATCH  /api/decks/:deckId
DELETE /api/decks/:deckId

GET    /api/decks/:deckId/cards
POST   /api/decks/:deckId/cards
PATCH  /api/cards/:cardId
DELETE /api/cards/:cardId
```

Response shape:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Error shape:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": []
  }
}
```

Use proper status codes:

- `200`: success.
- `201`: created.
- `204`: deleted/no content.
- `400`: bad input.
- `401`: not authenticated.
- `403`: no permission.
- `404`: not found.
- `409`: conflict.
- `422`: validation.
- `500`: server error.

## Validation

Validate at boundaries:

- Request body.
- Query params.
- Route params.
- Environment variables.
- Imported files.

Use schema validators:

- Zod
- Valibot
- Yup
- Joi

Example:

```ts
const CreateDeckSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  language: z.enum(["en", "zh", "ja"])
});
```

Frontend validation improves UX. Backend validation is mandatory.

## Auth And Permissions

Authentication answers: who are you?

Authorization answers: can you do this?

Rules:

- Never trust user id from request body.
- Get user from session/token.
- Check ownership in service layer.
- Every mutation must check permission.
- Every list endpoint must scope by user/team/org.

Example:

```ts
const deck = await deckRepository.findById(deckId);
if (!deck || deck.ownerId !== currentUser.id) {
  throw new NotFoundError();
}
```

Use `404` instead of `403` when revealing existence is risky.

## Frontend Page Structure

For each feature:

```text
features/decks/
  DeckListPage.tsx
  DeckDetailPage.tsx
  DeckForm.tsx
  deckApi.ts
  deckTypes.ts
  deckValidation.ts
```

Page responsibilities:

- Load data.
- Handle route params.
- Compose feature components.

Component responsibilities:

- Render UI.
- Emit user actions.
- Keep local form state.

API file responsibilities:

- Fetch endpoints.
- Parse responses.
- Throw typed errors.

## UI/UX Rules

For app/product UI:

- Build the working app screen first, not a marketing landing page.
- Use dense but readable layouts for dashboards/tools.
- Use cards for repeated items, not for every section.
- Keep border radius around 8px unless design system says otherwise.
- Buttons should be command-oriented.
- Use icon buttons where obvious.
- Keep feedback visible: loading, disabled states, empty states, error states.
- Avoid hidden destructive actions without confirm.

Standard states:

- Loading
- Empty
- Error
- Success saved
- Unsaved changes
- Permission denied
- Offline/retry

## Forms

Form rules:

- Required fields marked clearly.
- Disable submit while saving.
- Prevent double submit.
- Show validation near field when possible.
- Keep unsaved edits local until submit.
- For bulk edits, use draft state and one save.

Save button pattern:

```ts
try {
  setSaving(true);
  await save(data);
  toast.success("Saved");
} catch (error) {
  toast.error(error.message);
} finally {
  setSaving(false);
}
```

## Import / Export

Import rules:

- Validate file type and size.
- Parse using structured parser.
- Validate every row.
- Show row numbers for errors.
- Do not partially import if any row is invalid, unless user explicitly accepts partial import.
- Detect duplicates.
- Summarize imported/skipped counts.

Export rules:

- Include version field if format may evolve.
- Use stable IDs.
- Include created/updated timestamps if useful.

Example:

```json
{
  "version": 1,
  "exportedAt": "2026-05-11T00:00:00.000Z",
  "items": []
}
```

## Error Handling

Create typed errors:

```ts
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 500
  ) {
    super(message);
  }
}
```

Log server errors with context:

- request id
- user id
- route
- entity id
- stack trace

Do not expose stack traces to client.

## Logging And Monitoring

Production should have:

- Request logs.
- Error logs.
- Slow query logs.
- Deployment logs.
- Basic uptime monitor.

Useful tools:

- Sentry
- Logtail
- Datadog
- Grafana/Loki
- Cloud provider logs

## Testing Strategy

Minimum:

- Unit tests for pure business logic.
- API tests for important endpoints.
- Integration tests for DB repository/service.
- E2E smoke tests for critical flows.

Test pyramid:

```text
Many unit tests
Some integration tests
Few E2E tests
```

Critical flows always test:

- Sign up / login.
- Create entity.
- Edit entity.
- Delete entity.
- Permission boundary.
- Import/export if available.

## Environment Variables

`.env.example`:

```text
DATABASE_URL=
DIRECT_URL=
AUTH_SECRET=
APP_URL=
NODE_ENV=development
```

Rules:

- Never commit `.env`.
- Validate env on startup.
- Separate dev/staging/prod env.
- Rotate exposed secrets.

## Deployment Checklist

Before deploy:

- Tests pass.
- Typecheck pass.
- Lint pass.
- Migration reviewed.
- Backup available for destructive migration.
- Env vars configured.
- Build succeeds.
- Smoke test staging.

After deploy:

- Run migration.
- Smoke test production.
- Check logs.
- Check key flows.

Rollback:

- Know previous release version.
- Know whether migration is reversible.
- Keep backup before destructive changes.

## Git / PR Rules

Branch naming:

```text
feature/deck-crud
fix/card-import-validation
chore/update-deps
```

Commit style:

```text
Add deck CRUD
Fix import validation
Update database indexes
```

PR should include:

- What changed.
- Why.
- Screenshots for UI.
- Migration notes.
- Test evidence.
- Rollback risk.

## AI Agent Rules

When AI works on a fullstack app:

1. Read architecture docs before editing.
2. Identify data model and ownership.
3. Check current git status.
4. Do not overwrite user changes.
5. Keep changes scoped.
6. Update DB schema, migration, API, UI, docs together when feature crosses layers.
7. Run tests/typecheck/lint where available.
8. If touching auth or payments, be extra conservative.
9. Never invent secrets.
10. Document any manual deploy/migration step.

## Definition Of Done

A feature is done when:

- UI flow works.
- API contract is implemented.
- Database schema/migration is committed.
- Validation exists on backend.
- Permission checks exist.
- Loading/error/empty states exist.
- Tests or manual verification are recorded.
- Docs updated if behavior/schema changed.

