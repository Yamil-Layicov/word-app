# Word App API

NestJS API for the Word App backend.

## Setup

```bash
pnpm install
```

Create `apps/api/.env` from `apps/api/.env.example` and set real local values.

## Development

```bash
pnpm --filter @word-app/api start:dev
```

## Checks

```bash
pnpm --filter @word-app/api lint
pnpm --filter @word-app/api test
```

## E2E tests

E2E tests must never use the development database. Create a dedicated local
database named `wordapp_test`, copy `.env.test.example` to `.env.test`, then
run:

```powershell
pnpm test:e2e
```

The API refuses to connect to a database without `test` in its name while
`NODE_ENV=test`. Jest also loads only `.env.test` for E2E suites and runs the
suites serially to avoid shared-database races. The test command applies
migrations and seeds the dedicated database before Jest starts. Migration and
seed scripts run the same database-name safety check before making changes.
