# School MIS — Engineering PRD

**Stack:** React (frontend) · Node.js (backend) · PostgreSQL (database)
**Source of truth for business rules:** `MIS_Functional_Spec.docx` (Sections 1–4.2 sourced from the school; Sections 4.3–5 designed to fill gaps the source left open). This PRD translates that spec into an implementation plan. Section numbers like `(4.3.1)` below refer back to it — hand your code agent both documents.

---

## 1. Overview

A school management system built around RFID-based attendance (students and staff, via Android devices), an academic-year → semester → period calendar, class/subject/teacher scheduling, grading, fee billing with MTN MoMo payments, a library module, and eight user roles: Admin, Registrar, Accountant, Teacher, Student, Parent, Librarian, IT Staff.

This document defines the schema, API surface, background jobs, real-time behavior, and integrations needed to build it, plus a suggested build order. It intentionally does not repeat the *why* behind each rule — that's in the functional spec — only the *how*.

### 1.1 Open decisions before you start

Carry these over from the functional spec; they affect the schema below and should be confirmed with the school before or shortly after build starts:

1. **Registration fee amount** — **Resolved:** Admin sets the school-wide default registration fee as a system setting. The Accountant's `POST /students/:id/registration-invoice` pre-fills `amount_due` from that default but can still override it per invoice. This needs a small `system_settings` table (Section 3) since it's no longer just "assumed configurable" — it's an Admin-managed value read by another role's endpoint.
2. **Installment inheritance** — **Confirmed as designed:** the Accountant fully controls each installment plan — how many installments and their due-date timeframe — via `POST /classes/:id/installment-plans` (`number_of_installments`, `due_dates`). Unchanged from the original design. The narrower sub-question (a student joining a class *after* its plan is already active) wasn't addressed — the standing assumption stays: they get invoices for the plan's remaining, not-yet-due installments only. Flag this to the school before Phase 2.
3. **RFID hardware** — **Resolved, and simpler than assumed:** Android devices are used for attendance/circulation scanning only (these are the rows in the `devices` table, Section 3/5.9). UID capture for *new card assignment* is **not** one of those devices — IT Staff reads a blank card's UID with separate third-party software (outside this system) and pastes the resulting UID string into the app, which calls `PATCH /users/:id/rfid`. No device record, device auth, or hardware integration is needed for that step — it's just a text field bound to clipboard paste. Drop the "separate reader" language from 4.3.6 framing below.
4. **Currency** — **Resolved: Liberian Dollars (LRD).** Schema stays currency-agnostic (`numeric(12,2)`); seed `system_settings['currency'] = "LRD"` at setup. Confirm with MTN MoMo Liberia that Collections settles in LRD in your sandbox/production credentials before Phase 2 — if MoMo only settles in USD in practice, invoices may need a display currency (LRD) distinct from the settlement currency (USD), which would add a conversion step to `payments/momo/initiate` (5.5) that isn't in this PRD yet.
5. **Notification channel** — **Confirmed: email only**, no SMS. Every job/flow in Section 6.1 and Section 7.2 that mentions "email" is load-bearing, not optional — staff onboarding, student admission, invoice receipts, password reset/forgot-password, bulk messaging relay, and payslips must all reliably send. Treat email deliverability (SPF/DKIM, a real transactional provider in production, not just SMTP) as a Phase 1/2 concern, not a later polish item.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + Vite | TypeScript throughout the stack |
| Routing | React Router v6 | Role-gated routes (Section 4) |
| Server state | TanStack Query | Handles caching/refetch for REST calls |
| Client state | Zustand | Auth/session + UI-only state |
| Forms | React Hook Form + Zod | Same Zod schemas can be shared with the backend via a `packages/shared` package |
| Styling | Tailwind CSS | Fast to scaffold role dashboards |
| Realtime client | socket.io-client | Fee status + attendance live updates (Section 6) |
| Backend framework | Express + TypeScript | Widely known, easy for a code agent to extend correctly |
| Validation | Zod (`zod` + `express-zod-safe` or manual middleware) | Mirrors frontend schemas |
| ORM | Prisma | Type-safe queries + migrations against Postgres; `schema.prisma` should mirror Section 3's DDL |
| Auth | JWT (access + refresh), bcrypt | Access token short-lived (~15 min), refresh token rotated and stored hashed (`refresh_tokens` table, Section 3) |
| Background jobs | BullMQ + Redis | Section 6 lists every job |
| Realtime server | socket.io | Rooms per user and per class |
| Payments | MTN MoMo Collections API (axios) | Section 7.1 |
| Email | Nodemailer via SMTP or a transactional provider (Postmark/SendGrid) | Section 7.2 |
| PDF generation | `pdf-lib` or Puppeteer | Admission letters, payslips, receipts (Section 7.3) |
| File storage | S3-compatible bucket (AWS S3 / Cloudflare R2); MinIO for local dev | Images, CVs, transcripts, PDFs (Section 7.4) |
| Logging | pino | Structured logs; pair with `audit_log` table for business-level audit trail |
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend) | |
| Deployment | Docker Compose locally (postgres, redis, api, web); CI via GitHub Actions | |

### 2.1 Repo layout

Frontend and backend are top-level siblings, not nested — they deploy to different hosts (e.g. a static host for the frontend, a Node host for the backend), so each folder builds independently even though `packages/shared` links them for local dev:

```
/frontend         React frontend (Vite)
/backend          Express backend (Prisma)
/packages
  /shared         Zod schemas, TS types, constants shared by frontend + backend
/infra
  docker-compose.yml   (optional — see 2.2 on local Postgres/Redis)
  /migrations          Prisma migrations (generated)
```

npm workspaces wires `frontend`, `backend`, and `packages/*` together so `packages/shared` can be imported as `@school-mis/shared` from both sides without publishing it — this is a dev-time convenience only and doesn't require the two apps to be deployed together.

### 2.2 Local dev infrastructure note

The table above assumes Docker Compose for local Postgres/Redis/MinIO. If Docker isn't available in your dev environment, the equally valid fallback is: a natively installed Postgres, a natively installed Redis (or BullMQ running in-process without a queue for early development), and a local-filesystem storage adapter shaped like the S3 client interface (`putObject`/`getObject`) so swapping in real S3/R2 later touches one file. Whichever path you take, keep `DATABASE_URL`/`REDIS_URL`/`STORAGE_*` as the only things that change between local and production.

---

## 3. Database Schema (PostgreSQL)

Design notes before the DDL:

- All primary keys are `UUID DEFAULT gen_random_uuid()` (requires the `pgcrypto` extension). Human-facing identifiers (student ID number, invoice numbers) are separate columns, not primary keys.
- Every role that logs in is one row in `users`; role-specific fields live in `staff_profiles`, `student_profiles`, or `parent_profiles`. Admin, Registrar, Accountant, Teacher, Librarian, and IT Staff all share `staff_profiles` — they're distinguished by `users.role`, matching how the functional spec registers all of them through the same staff-registration flow (4.1.2).
- `transactions` carries `student_id` and `parent_id` directly (denormalized, nullable) alongside the canonical `invoice_id`/`staff_id` link, so the student's transaction view, the parent's, and the school's are three indexed queries against one table — not three copies (per the functional spec's Section 5 note).
- The double-booking rule (4.2.5) is enforced with two `UNIQUE` constraints on `timetable_entries`, not just application logic.
- `fee_invoices.balance` is a generated column so the red/green UI state (`status`) is always checkable against a value the database itself keeps consistent.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Enums
CREATE TYPE user_role AS ENUM ('admin','registrar','accountant','teacher','librarian','it_staff','student','parent');
CREATE TYPE user_status AS ENUM ('active','inactive','pending');
CREATE TYPE calendar_status AS ENUM ('upcoming','active','closed');
CREATE TYPE attendance_status AS ENUM ('present','late','absent');
CREATE TYPE attendance_method AS ENUM ('rfid','manual');
CREATE TYPE grade_status AS ENUM ('draft','submitted','confirmed','returned');
CREATE TYPE invoice_type AS ENUM ('registration_fee','installment','one_off');
CREATE TYPE invoice_status AS ENUM ('upcoming','due','paid');
CREATE TYPE transaction_type AS ENUM ('income','outgoing');
CREATE TYPE transaction_category AS ENUM ('registration_fee','tuition_installment','salary','expense','library_fine');
CREATE TYPE payment_method AS ENUM ('mtn_momo','cash','bank_transfer','other');
CREATE TYPE gateway_status AS ENUM ('pending','successful','failed');
CREATE TYPE loan_fine_status AS ENUM ('none','unpaid','paid');
CREATE TYPE device_purpose AS ENUM ('attendance','library');
CREATE TYPE device_status AS ENUM ('online','offline');

-- Identity ---------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  email CITEXT UNIQUE,
  phone VARCHAR(20) UNIQUE,
  id_number VARCHAR(30) UNIQUE,               -- generated for students on approval (4.2.3)
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  status user_status NOT NULL DEFAULT 'active',
  rfid_uid VARCHAR(64) UNIQUE,                 -- set only via the IT Staff scoped endpoint (4.3.6)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_identifier_present CHECK (email IS NOT NULL OR id_number IS NOT NULL)
);

CREATE TABLE rfid_assignment_log (               -- audit trail behind 4.3.6
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  rfid_uid VARCHAR(64) NOT NULL,
  previous_rfid_uid VARCHAR(64),
  assigned_by UUID NOT NULL REFERENCES users(id), -- IT Staff
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_profiles (                    -- admin, registrar, accountant, teacher, librarian, it_staff
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  image_url TEXT,
  emergency_contact TEXT,
  salary NUMERIC(12,2) NOT NULL,
  cv_url TEXT,
  employment_letter_url TEXT,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parent_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Academic calendar (functional spec Section 3.1) -------------------------

CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status calendar_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence SMALLINT NOT NULL CHECK (sequence IN (1,2)),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status calendar_status NOT NULL DEFAULT 'upcoming',
  UNIQUE (academic_year_id, sequence)
);

CREATE TABLE periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 3),
  is_exam_period BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status calendar_status NOT NULL DEFAULT 'upcoming',
  UNIQUE (semester_id, sequence)
);

-- Classes, subjects, students ----------------------------------------------

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- e.g. "Grade 4A"
  fixed_fee NUMERIC(12,2) NOT NULL,
  max_students INT NOT NULL,
  is_self_contained BOOLEAN NOT NULL DEFAULT FALSE,
  sponsor_teacher_id UUID REFERENCES users(id),  -- multi-teacher classes only (4.1.4)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE class_subjects (                  -- subject+teacher assignment within a class
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (class_id, subject_id)
);

CREATE TABLE student_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  photo_url TEXT,
  transcript_url TEXT,                          -- only when transferring from another school (4.2.1)
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES users(id),
  admission_status TEXT NOT NULL DEFAULT 'pending' CHECK (admission_status IN ('pending','approved')),
  admission_letter_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduling (4.1.9, 4.2.5) -------------------------------------------------

CREATE TABLE timetable_slots (                 -- the weekly framework Admin defines once
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE (start_time, end_time)
);

CREATE TABLE timetable_entries (               -- what the Registrar places into each slot, per day
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  timetable_slot_id UUID NOT NULL REFERENCES timetable_slots(id),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Mon .. 5=Fri
  UNIQUE (teacher_id, timetable_slot_id, day_of_week),   -- blocks teacher double-booking
  UNIQUE (class_id, timetable_slot_id, day_of_week)      -- blocks class double-booking
);

-- Attendance (core function — RFID via Android, 4.1.4, 4.3.2) --------------

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),      -- null for a self-contained class's daily record
  session TEXT CHECK (session IN ('morning','end_of_day')), -- self-contained classes only
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  method attendance_method NOT NULL,
  recorded_by UUID REFERENCES users(id),        -- teacher, for a manual entry
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, subject_id, session)
);

CREATE TABLE staff_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  method attendance_method NOT NULL DEFAULT 'rfid',
  UNIQUE (staff_id, date)
);

-- Grading (4.3.2, 4.2.8) -----------------------------------------------------

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  period_id UUID NOT NULL REFERENCES periods(id),
  score NUMERIC(5,2) NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id),
  status grade_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),       -- Registrar
  UNIQUE (student_id, subject_id, period_id)
);

-- Messaging (4.1.8, 4.3.2) ---------------------------------------------------

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  audience TEXT NOT NULL,          -- all_parents | all_staff | staff_role | all_students | class | custom
  audience_filter JSONB,           -- e.g. {"role":"teacher"} or {"class_id":"..."}
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ
);

-- Fees, installments, payments (4.3.1, Section 5) ---------------------------

CREATE TABLE installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  semester_id UUID NOT NULL REFERENCES semesters(id),
  total_amount NUMERIC(12,2) NOT NULL,          -- = classes.fixed_fee at creation time
  number_of_installments SMALLINT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id), -- Accountant
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  class_id UUID REFERENCES classes(id),
  semester_id UUID REFERENCES semesters(id),
  invoice_type invoice_type NOT NULL,
  installment_plan_id UUID REFERENCES installment_plans(id),
  installment_sequence SMALLINT,
  amount_due NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  category transaction_category NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference TEXT,
  recorded_by UUID REFERENCES users(id),        -- Accountant; null for a gateway-confirmed payment
  invoice_id UUID REFERENCES fee_invoices(id),
  staff_id UUID REFERENCES users(id),           -- for payroll/expense rows
  student_id UUID REFERENCES users(id),         -- denormalized: powers the student's own transaction view
  parent_id UUID REFERENCES users(id),          -- denormalized: powers the parent's transaction view
  payment_method payment_method NOT NULL,
  gateway_reference TEXT,
  gateway_status gateway_status,
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_parent ON transactions(parent_id);

-- Library (4.3.5) -------------------------------------------------------------

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT UNIQUE,
  category TEXT,
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1
);

CREATE TABLE book_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  borrower_id UUID NOT NULL REFERENCES users(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  fine_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  fine_status loan_fine_status NOT NULL DEFAULT 'none'
);

CREATE TABLE book_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

-- Devices & audit (4.3.6) ------------------------------------------------------

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id),         -- null when purpose = 'library'
  purpose device_purpose NOT NULL,
  api_key_hash TEXT NOT NULL,                    -- device auth, separate from user JWTs
  status device_status NOT NULL DEFAULT 'offline',
  last_sync_at TIMESTAMPTZ,
  registered_by UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,             -- 'password_reset' | 'rfid_assigned' | 'grade_override' | ...
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System settings (Admin-managed, Section 1.1) -----------------------------

CREATE TABLE system_settings (            -- key/value store for school-wide config
  key TEXT PRIMARY KEY,                   -- 'default_registration_fee' | 'currency' | ...
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),   -- Admin
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth support -------------------------------------------------------------

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Roles & Access Control

`users.role` drives an RBAC middleware on every route. Three access rules cut across the whole API and are easy to get wrong, so a code agent should implement them as shared middleware rather than per-route checks:

- **Self-service password change** — any authenticated user can change their own password, but only after re-submitting their current one (4.1.7). No role bypasses this.
- **Admin-only contact changes** — only `role = 'admin'` can change a user's `email` or `phone` (4.1.7). Enforce this in the users-update handler, not just in the frontend.
- **IT Staff's RFID-only edit** — the IT Staff RFID endpoint (`PATCH /api/users/:id/rfid`, below) must not accept or touch any field besides `rfid_uid`, even if the request body includes others. Reject extra fields rather than silently ignoring them (4.3.6).

| Role | Primary access |
|---|---|
| Admin | Full read access; write access to staff, classes, subjects, academic calendar, timetable framework, bulk messaging, own contact info, system settings incl. default registration fee (4.1) |
| Registrar | Student intake, parent matching, manual approval override, timetable building, student class placement, grade confirmation (4.2) |
| Accountant | Registration-fee invoicing, installment plans, payments (manual + MTN MoMo), payouts, payroll, financial reports (4.3.1) |
| Teacher | Own timetable, attendance for assigned classes/subjects, grade entry, class-level messaging (4.3.2) |
| Student | Read-only: own attendance, timetable, confirmed grades, invoices/transactions, library loans; pay own invoices (4.3.3) |
| Parent | Read-only across linked children + pay invoices on their behalf; own contact info still admin-only (4.3.4) |
| Librarian | Book catalog, circulation, holds, fines (4.3.5) |
| IT Staff | Device management, scoped RFID field updates, password resets, system settings, audit log, backups (4.3.6) |

---

## 5. API Endpoints

REST, JSON, versioned under `/api/v1`. Every route below requires a valid access token unless marked **public**; role is enforced by the middleware in Section 4. `me` routes resolve to the caller's own `user_id` from the token — never accept a client-supplied user id for "my own record" reads.

### 5.1 Auth

- `POST /auth/login` **public** — `{identifier, password}` → access + refresh token. `identifier` accepts email, `id_number`, or phone (parents).
- `POST /auth/refresh` **public** (refresh token in httpOnly cookie or body) → new access token.
- `POST /auth/logout` — revokes the refresh token.
- `POST /auth/change-password` — `{current_password, new_password}` (4.1.7).
- `POST /auth/forgot-password` **public** — `{email}` → reset link email (4.2.4).
- `POST /auth/reset-password/:token` **public** — `{new_password}`.

### 5.2 Admin — Staff, Calendar, Classes, Subjects, Scheduling, Messaging

- `POST /staff` — create staff; triggers `sendStaffOnboardingEmail` job (4.1.2).
- `GET /staff`, `GET /staff/:id`, `PATCH /staff/:id`, `PATCH /staff/:id/deactivate`, `DELETE /staff/:id`.
- `POST /academic-years`, `GET /academic-years`, `PATCH /academic-years/:id`.
- `POST /academic-years/:id/semesters` (system enforces exactly 2, `sequence` 1/2).
- `POST /semesters/:id/periods` (system enforces exactly 3, third flagged `is_exam_period`).
- `POST /classes`, `GET /classes`, `PATCH /classes/:id`.
- `POST /subjects`, `GET /subjects`, `PATCH /subjects/:id`.
- `POST /classes/:id/subjects` — `{subject_id, teacher_id}`, upserts into `class_subjects`.
- `POST /timetable-slots`, `GET /timetable-slots` — the weekly framework (4.1.9).
- `POST /messages` — bulk send; `audience` + `audience_filter` per Section 3 schema (4.1.8).
- `GET /dashboard/summary` — totals + chart data (4.1.1).
- `GET /settings`, `PUT /settings/:key` — school-wide config (`system_settings`), including `default_registration_fee` and `currency` (1.1). Admin-only write.

### 5.3 Registrar — Intake, Timetable Building, Records, Grade Confirmation

- `POST /students` — intake form; creates `users` (role=student, status=pending) + `student_profiles` (4.2.1).
- `POST /students/:id/match-parent` — `{phone}` → existing parent (for confirmation) or `null` (frontend shows "Create New Parent").
- `POST /parents` — creates a new parent when no match is found (4.2.2).
- `PATCH /students/:id/class` — promotion/transfer between arms (4.2.6).
- `GET /students/:id`, `GET /students?status=pending`.
- `GET /admissions/report?period_id=` (4.2.7).
- `POST /timetable-entries` — place a class-subject pair into a slot/day; **the two `UNIQUE` constraints on `timetable_entries` return 409 on double-booking** (4.2.5).
- `GET /timetable-entries?class_id=`.
- `GET /grades/pending?class_id=&subject_id=` — grades awaiting confirmation.
- `POST /grades/confirm` — `{grade_ids: [...]}`, bulk (4.2.8).
- `POST /grades/:id/return` — sends it back to the teacher.
- `POST /students/:id/approve` — Registrar's manual override path (4.2.3); normally this happens automatically when the registration invoice is paid (see 5.4).

### 5.4 Accountant — Fees, Installments, Payments, Payroll

- `POST /students/:id/registration-invoice` — creates the gating `fee_invoices` row (`invoice_type='registration_fee'`); `amount_due` defaults to `system_settings['default_registration_fee']` (Admin-set, 1.1) but the Accountant can override it in the request body (4.3.1).
- `POST /classes/:id/installment-plans` — `{semester_id, number_of_installments, due_dates: [...]}`; generates one `fee_invoices` row per current student per installment, first one `status='due'`.
- `GET /installment-plans/:id`.
- `POST /invoices/:id/payments` — manual payment (cash/bank transfer); updates `amount_paid`/`status` and writes a `transactions` row (4.3.1).
- `POST /payments/momo/initiate` — `{invoice_id}` → MTN MoMo checkout reference/redirect URL (5.5).
- `POST /payments/momo/webhook` **public, signature-verified** — MTN MoMo payment callback (5.5).
- `GET /transactions?student_id=&parent_id=&scope=school` — the three views described in Section 3.
- `POST /transactions` — record an outgoing payout/expense (4.3.1).
- `POST /payroll/run` — `{month}`, runs payroll for all active staff (4.3.1).
- `GET /staff/:id/payslips`.
- `GET /reports/financial?from=&to=` (shared with Admin, 4.1.6).

### 5.5 Payments — MTN MoMo detail

1. `POST /payments/momo/initiate` looks up the invoice, calls MTN MoMo's Collections `requesttopay`, stores a `transactions` row with `gateway_status='pending'`, and returns whatever the frontend needs to show the MoMo prompt (reference id at minimum).
2. MTN MoMo calls `POST /payments/momo/webhook` on completion. Verify the callback signature/subscription key before trusting it.
3. On a successful callback: update the matching `transactions` row to `gateway_status='successful'`, increment `fee_invoices.amount_paid`, flip `status` to `'paid'` once `balance = 0`, and emit a `invoice:paid` socket event (Section 6) to the student's and parent's rooms.
4. On failure: `gateway_status='failed'`, invoice stays `due`, frontend shows a retry option.
5. Add a scheduled `momoPaymentReconciliation` job (Section 6) that polls MTN MoMo for any `transactions` still `pending` after N minutes, in case a webhook is missed — don't rely on the webhook alone.
6. If a paid registration-fee invoice (`invoice_type='registration_fee'`) triggers approval: on success, also flip `student_profiles.admission_status='approved'` and enqueue the same provisioning job the Registrar's manual-approve endpoint uses (4.2.3, 4.3.1) — write this as one shared function called from both places, not duplicated.

### 5.6 Teacher

- `GET /me/timetable` (4.3.2).
- `GET /attendance?class_id=&subject_id=&date=` — RFID-captured rows for the open window.
- `POST /attendance/manual` — `{student_id, class_id, subject_id?, session?, status}` for students with no RFID tap.
- `POST /grades` — `{student_id, subject_id, period_id, score}`, `status` starts `'submitted'`; locked from further teacher edits until Registrar confirms/returns it (4.3.2).
- `POST /messages/class` — `{class_id, subject, body}` (4.3.2).

### 5.7 Student & Parent

- `GET /me/attendance`, `GET /me/timetable`, `GET /me/grades`, `GET /me/invoices`, `GET /me/transactions`, `GET /me/loans` (4.3.3).
- `GET /parent/children` — every linked child (4.3.4).
- `GET /parent/children/:studentId/attendance` | `/timetable` | `/grades` | `/invoices` | `/transactions` | `/loans` — same shapes as the `/me/*` routes, scoped to a linked child; reject if `studentId` isn't linked to the caller.
- `POST /invoices/:id/pay` — either role; wraps `payments/momo/initiate` (5.5), scoped so a Parent can only pay a linked child's invoice and a Student only their own.

### 5.8 Librarian

- `POST /books`, `GET /books`, `PATCH /books/:id` (4.3.5).
- `POST /loans` — `{book_id, borrower_id, due_date}`, issues by RFID lookup or search.
- `PATCH /loans/:id/return` — sets `return_date`, recalculates `fine_amount`/`fine_status`, and if a fine is owed, writes an outgoing-flagged `transactions` row (`category='library_fine'`) once collected.
- `POST /loans/:id/hold`, `GET /loans/overdue`.

### 5.9 IT Staff

- `POST /devices`, `GET /devices`, `PATCH /devices/:id` — register/monitor RFID readers (4.3.6).
- `POST /devices/:deviceId/scans` — **device-authenticated** (API key, not user JWT) — `{rfid_uid, scanned_at}`. Resolves `rfid_uid` → `users`, then either writes `attendance_records`/`staff_attendance_records` (device `purpose='attendance'`) or is used as the borrower lookup for `/loans` (`purpose='library'`).
- `GET /users/search?query=` — search by `id_number`/email/name; response includes only the fields IT Staff's RFID tool needs, not a full profile.
- `PATCH /users/:id/rfid` — `{rfid_uid}` **only**; writes `rfid_assignment_log`, updates `users.rfid_uid` (4.3.6). Reject any other field in the body with a 400. IT Staff obtains `rfid_uid` from third-party UID-reader software (outside this system) and pastes it into the form that calls this endpoint — no device record or device auth is involved in this step (1.1).
- `POST /users/:id/password-reset` — elevated action; generates a temp password, sets `must_change_password=true`, writes `audit_log` (4.3.6).
- `GET /audit-log?actor_id=&action=&from=&to=`.
- `POST /backups/run`, `GET /backups`.

---

## 6. Background Jobs & Realtime

### 6.1 BullMQ jobs (Redis-backed)

| Job | Trigger | Does |
|---|---|---|
| `provisionStudentAccount` | Registration invoice paid, or Registrar manual approve | Generates ID number + default password, creates admission letter PDF, emails student + parent (4.2.3) |
| `generateInstallmentInvoices` | Installment plan created | Writes one `fee_invoices` row per student per installment (4.3.1) |
| `transitionAcademicCalendar` | Cron, hourly | Flips `academic_years`/`semesters`/`periods.status` as `start_date`/`end_date` are crossed (Section 3) |
| `activateDueInstallments` | Cron, daily | Flips `fee_invoices.status` `upcoming → due` as each `due_date` arrives |
| `sendStaffOnboardingEmail` | Staff created | Welcome email + employment letter PDF + credentials (4.1.2) |
| `runMonthlyPayroll` | Cron, monthly (or Accountant-triggered) | Payroll for all active staff + payslip PDFs (4.3.1) |
| `calculateOverdueLibraryFines` | Cron, daily | Scans open `book_loans` past `due_date`, updates `fine_amount` |
| `momoPaymentReconciliation` | Cron, every few minutes | Polls MTN MoMo for any `transactions` stuck `pending` (5.5) |
| `runBackup` | Cron, daily, or IT Staff-triggered | `pg_dump` to the file storage bucket |

Attendance/timetable *window* open/close (8:45–1:30 for self-contained classes; a subject's slot times otherwise) does **not** need a job — compute it at request time by comparing `now()` to the relevant slot or fixed window, since it only gates whether a write is accepted.

### 6.2 Realtime (Socket.io)

- Each authenticated client joins a room for their own `user_id` on connect.
- Server emits `invoice:paid` and `invoice:due` into a student's and (if linked) their parent's rooms (5.5) — drives the red/green dashboard update without a page refresh.
- Server emits `attendance:recorded` into a `class:{classId}` room a Teacher's dashboard subscribes to, for the live RFID-tap list (4.3.2).
- Server emits `message:new` into a recipient's room when a message is sent to them (4.1.8, 4.3.2).

---

## 7. Third-Party Integrations

### 7.1 MTN MoMo

Use the Collections API (`requesttopay` + status polling + webhook/callback). You'll need: subscription key, API user/API key (sandbox first), target environment, and a publicly reachable webhook URL for `POST /payments/momo/webhook`. Verify the callback's signature/subscription key before trusting any payload — never update an invoice from an unverified request.

### 7.2 Email

Nodemailer against SMTP, or a transactional provider (Postmark/SendGrid) for deliverability. Templates needed: staff welcome + employment letter, student admission letter, invoice receipt, password reset, forgot-password link, bulk message relay.

### 7.3 PDF generation

`pdf-lib` (lightweight, good for template-filling) or Puppeteer (HTML→PDF, easier for rich layouts) for: employment letters, admission letters, receipts, payslips.

### 7.4 File storage

S3-compatible bucket for staff/student photos, CVs, transcripts, and generated PDFs. Store the bucket key on the relevant row (`image_url`, `cv_url`, etc.) rather than the file itself. Use MinIO in Docker Compose for local dev so the same S3 client code works in both environments.

---

## 8. Non-Functional Requirements

- **Auth:** bcrypt (or argon2) password hashing; short-lived JWT access tokens; refresh tokens stored hashed and rotated on use; revoke on logout/password change.
- **Device auth:** RFID devices authenticate with a per-device API key (`devices.api_key_hash`), never a user JWT — a compromised classroom tablet shouldn't grant user-level access.
- **Authorization:** centralize the three cross-cutting rules from Section 4 as middleware, not per-route logic.
- **Audit:** every password reset, RFID (re)assignment, financial record edit, and grade override writes an `audit_log` row (4.3.6).
- **Input validation:** Zod schemas on every write endpoint, shared between frontend and backend via `packages/shared`.
- **Rate limiting:** on `/auth/*` and `/payments/momo/*` at minimum.
- **Backups:** daily `pg_dump`, retained per the school's policy; IT Staff can trigger one on demand (4.3.6).

### 8.1 Environment variables (backend)

```
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SMTP_HOST= / EMAIL_PROVIDER_API_KEY=
S3_ENDPOINT= / S3_BUCKET= / S3_ACCESS_KEY= / S3_SECRET_KEY=
MOMO_SUBSCRIPTION_KEY=
MOMO_API_USER=
MOMO_API_KEY=
MOMO_ENVIRONMENT=sandbox|production
MOMO_CALLBACK_URL=
APP_CURRENCY=LRD
```

---

## 9. Suggested Build Order

**Phase 1 — Core:** auth + RBAC middleware, academic calendar CRUD + auto-transition job, staff CRUD + onboarding email, student intake + parent matching (manual approval only, no fee gate yet), classes/subjects/timetable framework + builder with double-booking constraints, RFID device registration + scan endpoint + attendance read/manual-mark, basic role dashboards.

**Phase 2 — Money:** registration-fee invoicing + payment-gated approval, installment plans, MTN MoMo integration (sandbox), transactions and the three-way view, financial reports, payroll.

**Phase 3 — Everything else:** grading + confirmation workflow, messaging, library module, IT Staff RFID-assignment tool + password resets + audit log, realtime sockets, backups.

Build and demo in that order — Phase 2 depends on Phase 1's users/classes/students existing, and Phase 3's pieces are largely independent of each other so they can run in parallel once Phase 1 is stable.

