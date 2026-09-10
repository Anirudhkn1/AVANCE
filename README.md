# Avance

**A game layer for real-world work.**

Avance turns an assignment into a sequence of measurable checkpoints: students always
know what to do next, and institutions get visibility into progress and risk before a
deadline turns into a crisis. See [`prd.md`](./prd.md) for the full product spec this
build follows.

This is a real full-stack app — Next.js (App Router) + TypeScript + Prisma/SQLite +
NextAuth credentials auth + Tailwind — not a static mockup. Every button is wired to a
server action or route handler with server-side permission checks; nothing trusts
client-supplied roles, XP, or verification state.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions)
- **Prisma 5 + SQLite** — file-based DB at `prisma/dev.db`, zero external services required
- **NextAuth v5 (beta)** — email/password credentials, hashed with bcrypt
- **Tailwind CSS v4**
- Rule-based **AI Quest Builder** (`src/lib/questBuilder.ts`) — parses pasted text, PDF
  (`pdf-parse`), or DOCX (`mammoth`) into a proposed checkpoint sequence. No external AI
  API call is wired up; everything always goes through an editable human-approval step
  before publishing (see PRD §11, §39-40).

## Run it

```bash
npm install        # also runs `prisma generate` via postinstall
npm run db:push     # create/sync the SQLite schema
npm run db:seed     # seed demo org, users, and a project with realistic progress
npm run dev          # http://localhost:3000
```

To wipe and reseed at any point: `npm run db:reset`.

### Demo accounts

All seeded accounts use the password `password123`.

| Role | Email |
|---|---|
| Organisation Head | `head@avance.dev` |
| Group Host / Lecturer | `host@avance.dev` |
| Students | `student1@avance.dev` … `student12@avance.dev` |

The seed creates an organisation **CSE-A** (join code `CSEA-2025`), one group, and the
PRD's own worked example project — *"Build a C Banking Management System"* — with
per-student progress spread across On Track / At Risk / Critical so the Command Center
(`/organisations/{orgId}/command-center`) has something real to show.

## Project layout

```
prisma/schema.prisma   Data model (Organisation → Group → Project → Checkpoint, + a
                        separate Habit system per PRD §30)
prisma/seed.ts          Demo data
src/auth.ts              NextAuth config (credentials provider)
src/lib/                 Server-only domain logic: permissions, risk/deadline-health
                          scoring, XP + streak awarding, the quest builder, file
                          extraction/storage, audit logging
src/actions/              Server actions (mutations) — every one re-derives identity
                          from the session and re-checks authorization server-side
src/app/                  Routes. Most pages branch on the caller's org role to render
                          either the student or host view of the same URL.
src/components/           Shared UI + the client-side interactive bits (quest builder
                          wizard, submission forms, review actions)
uploads/                  Submission PDFs, served only through the authenticated
                          /api/files/[submissionId] route — never under /public
```

## Notes on scope

This build implements the PRD's MVP feature set end-to-end (§36): auth & roles,
organisations/groups, AI-assisted or manual project creation, linear checkpoints,
PDF submission with automatic or host-approval verification, the host Command Center
with on-track/at-risk/critical indicators and checkpoint bottleneck analytics,
XP/streaks/group leaderboard, Fair Play (host-only, auditable), a personal habit
tracker kept deliberately outside the org data model, and in-app notifications.

Deliberately out of scope, per §37 and to keep this a runnable local project: no
external AI API call (the quest builder is a documented rule-based fallback — the exact
seam the PRD requires regardless of AI availability), no cloud file storage, no
background job runner for notifications/retention (those run opportunistically instead
of on a cron), no LMS integrations.
