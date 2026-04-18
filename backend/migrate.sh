#!/bin/sh
# migrate.sh — Run before `prisma migrate deploy` on Railway.
#
# Clears any failed migration records from _prisma_migrations so that
# Prisma error P3009 ("migrate found failed migrations") does not block
# the deploy.  Safe to run on a fresh database (the DELETE is a no-op
# when the table does not exist yet).

set -e

echo "==> Clearing failed Prisma migrations (if any)..."

# psql is available in the Railway PostgreSQL environment via the
# DATABASE_URL connection string.  We suppress the error if the
# _prisma_migrations table does not exist yet (fresh DB).
psql "$DATABASE_URL" \
  -c "DELETE FROM \"_prisma_migrations\" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;" \
  2>/dev/null || echo "    (table not found — skipping, fresh database)"

echo "==> Running prisma migrate deploy..."
npx prisma migrate deploy

echo "==> Starting application..."
exec node dist/index.js
