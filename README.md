# School MIS

Phase 1 implementation of `MIS_Engineering_PRD.md`: a Node/Express/Prisma backend and a React frontend, kept as
separate top-level projects (`backend/`, `frontend/`) since they deploy to different hosts. `packages/shared`
is an npm workspace that lets both sides import the same Zod validation schemas locally — it doesn't couple
their deployments.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL (native install is fine — no Docker required)
- Redis (native install is fine — no Docker required)

## First-time setup

1. **Database** — create a role + database (adjust credentials as you like, then match them in `backend/.env`).
   Named `school1_mis` deliberately, not `school_mis` — that name is already in use by the unrelated
   Laravel project at `Finalyear/backend` on this machine:
   ```sql
   CREATE ROLE school_mis LOGIN PASSWORD 'school_mis';
   CREATE DATABASE school1_mis OWNER school_mis;
   ```
2. **Redis** — install and make sure it's running on `localhost:6379` (`redis-cli ping` should return `PONG`).
3. **Install dependencies** (from the repo root):
   ```
   npm install
   ```
   The first install will ask you to approve native build scripts for `bcrypt`, `@prisma/client`,
   `@prisma/engines`, `prisma`, `esbuild`, and `msgpackr-extract` — these are required, run:
   ```
   npm install-scripts ls
   npm install-scripts approve <pkg>   # for each one listed
   npm install
   ```
4. **Build the shared package** (backend/frontend resolve `@school-mis/shared` from its build output):
   ```
   npm run build -w packages/shared
   ```
5. **Env files** — copy the examples and fill in real values:
   ```
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   At minimum, set `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` in `backend/.env` for staff onboarding,
   student admission, and password-reset emails to actually send — without them the API logs a warning and
   skips sending instead of failing.
6. **Migrate + seed the database**:
   ```
   npm run prisma:migrate
   npm run prisma:seed
   ```
   Seeding creates one Admin login (`admin@school.example` / `ChangeMe123!`, must change password at first
   login), the `default_registration_fee`/`currency` system settings, and a default set of timetable slots.

## Running

```
npm run dev
```
Runs the API (`http://localhost:4000`) and the frontend (`http://localhost:5173`) together. Uploaded files
(admission/employment letter PDFs) are served from the API at `/files/...` via a local-filesystem storage
adapter (see `backend/src/lib/storage.ts`) — swap that one file for a real S3/R2 client when deploying.

## Tests

```
npm test
```
