# Agents

## Cursor Cloud specific instructions

### Overview

**Hausdame** is a multi-tenant SaaS for managing vacation rental property cleaning (Next.js 16, React 19, Prisma 7, PostgreSQL via Neon, Tailwind CSS 4). The codebase is primarily in Spanish.

### Services

| Service | Port | How to start |
|---------|------|--------------|
| PostgreSQL | 5432 | `sudo pg_ctlcluster 16 main start` |
| Neon WebSocket Proxy | 80 | `sudo docker start neon-wsproxy` (or create with command below) |
| Next.js dev server | 3000 | `npm run dev` |

### Local database setup (required once per VM)

The app uses `@neondatabase/serverless` + `@prisma/adapter-neon`, which requires a WebSocket proxy between the driver and PostgreSQL.

1. Ensure PostgreSQL is running: `sudo pg_ctlcluster 16 main start`
2. Ensure the Neon wsproxy Docker container is running on port 80:
   ```
   sudo docker start neon-wsproxy 2>/dev/null || \
   sudo docker run -d --name neon-wsproxy --network host \
     -e "APPEND_PORT=localhost:5432" -e "ALLOW_ADDR_REGEX=.*" \
     ghcr.io/neondatabase/wsproxy:latest
   ```
3. The `.env` file must contain: `DATABASE_URL="postgresql://hausdame:hausdame123@localhost:5432/hausdame"`
4. `instrumentation.ts` auto-configures the Neon driver for local use when `DATABASE_URL` contains `localhost`.
5. `next.config.ts` externalizes `@neondatabase/serverless` and `@prisma/adapter-neon` from webpack so the instrumentation config is shared with server code.

### Key gotchas

- **NODE_OPTIONS in .env does not work** for configuring the Neon driver. `.env` is loaded by Next.js after process startup, so `NODE_OPTIONS` preload scripts are not applied. The `instrumentation.ts` + `serverExternalPackages` approach is required instead.
- **For non-Next.js scripts** (seed, migrations, etc.), use the preload: `NODE_OPTIONS="--require ./neon-local-config.cjs"` before the command, or the script's own dotenv loading handles `.env` automatically for `DATABASE_URL`.
- **Prisma migrations** use `prisma.config.ts` which loads dotenv and connects directly via TCP (not through the Neon adapter), so migrations work without the wsproxy.
- **Dev users**: `ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo` creates a demo tenant with users. Login: `owner1@hausdame.test` / `Test123456`.
- **Lint** has ~858 pre-existing errors (mostly `@typescript-eslint/no-explicit-any`). This is known.

### Standard commands

See `package.json` scripts and `docs/QUICK_START.md` for the full list. Key ones:
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prisma migrate deploy` — apply migrations
- `npm run db:sanity` — validate DB state
