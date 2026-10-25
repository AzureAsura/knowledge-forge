# KnoFo — Knowledge Forge

A gamified internal knowledge-sharing platform. Team members write **Scrolls** (tutorials, bug fixes, SOPs, lessons learned), seniors review them, and every contribution earns **XP, levels and badges** and advances the **Topic Mastery Tree**.

- **Backend:** Go, Gin, GORM, PostgreSQL (Neon), Cloudinary for image uploads
- **Frontend:** React 19, Vite, React Router v7, TanStack Query, Tailwind v4 (neumorphic style)

```
backend/    Go API (features/*, shared/*, cmd/seed)
frontend/   React SPA (src/components, src/features, src/routes)
task.md     Work tracker and manual verification checklist
```

## Features

| Area | What it does |
|---|---|
| **Scrolls** | WYSIWYG editor (TipTap, stored as Markdown), cover and inline images, filters, sorting, search, pagination. Status flow: draft → pending → published → archived; seniors/admins review (approve/reject), admins can feature scrolls |
| **Engagement** | Likes, saves, comments, read counts (only the first read is recorded) |
| **Gamification** | XP with daily caps, levels 1–50 with titles, 8 badges (automatic and manual), three streak types (daily login, weekly scroll, daily read) with an "about to break" warning |
| **Topic Tree** | React Flow graph per category: topic levels 0–5, level requirements, bonus XP, graph/list views, other users' trees |
| **Mentoring** | Scholars follow a senior as mentor; the mentor earns passive XP when an apprentice's first scroll is published |
| **Challenges** | Time-boxed challenges with XP rewards, proof-URL submissions, admin review, banner and countdown |
| **Analytics** | Role-based dashboards: personal activity, mentoring, platform (admin) |
| **Leaderboard** | XP, authors and mentors for the week, month or all time |
| **UI** | Level-up modal, badge card and toast, streak tooltip, page transitions, animations (respects `prefers-reduced-motion`) |

### Roles

| Role | Can |
|---|---|
| `scholar` | Write, read, interact, join challenges, pick a mentor |
| `senior` | Everything a scholar can, plus review scrolls (never their own) and see apprentices |
| `admin` | Everything a senior can, plus manage users, challenges, manual badges, featured scrolls and platform analytics |

## Running locally

Prerequisites: Go 1.27+, Node 22+, a PostgreSQL database (e.g. Neon), a Cloudinary account (for image uploads).

### 1. Backend

```bash
cd backend
cp .env.example .env     # then fill in the values
go run .                 # API on :8080
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign access tokens (long and random) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Avatar, cover and editor image uploads |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Initial admin account |
| `PORT` | API port (default 8080) |
| `APP_ENV` | `development` enables the `/dev/*` routes (localhost only). Leave unset in production |
| `RATE_LIMIT_ENABLED` | Initial state of the rate limiter (default `true`) |

Tables are created automatically by GORM AutoMigrate when the server starts. Create the categories and the admin account with:

```bash
go run ./cmd/seed          # ensures the categories exist
go run ./cmd/createadmin   # creates the admin from .env
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:8080` (prefix stripped), so no CORS setup is needed in development. In production set `VITE_API_BASE_URL`, or serve the API from the same origin.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check, then production build |
| `npm run lint` | oxlint |

## Demo data

To make the app feel alive right away, the seeder fills the database with a fictional team and 120 days of history:

```bash
cd backend
go run ./cmd/seed -reset
```

**This deletes all data except the categories.** It only runs when `APP_ENV=development`, and asks you to type `RESET` to confirm (add `-yes` to skip the prompt).

You get:

- 17 accounts (2 admins, 5 seniors, 10 scholars) with bios and profile photos
- 41 scrolls with images across 6 topics: published, pending, draft and archived
- comments, likes, saves, reads, XP, levels, badges, streaks, mentors/apprentices, and 6 challenges with submissions

The simulation applies the same XP rules, daily caps, streaks and badge logic as the backend, then checks consistency (total XP, like/comment/read counts, review status). Scroll content lives in `backend/cmd/seed/content/*.md` and the personas in `backend/cmd/seed/people.go`. The demo account list and passwords are in `frontend/note.md` (do not commit it).

## Rate limiter and dev mode

Defaults: login 5 attempts per 15 minutes per IP, comments 20/min, create scroll 10/hour, upload 20/hour, general 100/min. With `APP_ENV=development`:

```bash
curl localhost:8080/dev/rate-limit                                 # status
curl -X PUT localhost:8080/dev/rate-limit -d '{"enabled":false}'   # turn off
curl -X DELETE localhost:8080/dev/rate-limit/counters              # reset counters
```

## Architecture in brief

**Backend** — `features/<name>` holds routes, handlers, services and DTOs; `shared/` holds models, gamification (XP, streaks, badges, mastery), middleware and utilities. Responses use a `{ "message", "data" }` envelope with snake_case JSON.

- Auth: a 15-minute JWT access token plus a random refresh token stored hashed in the database, rotated on every refresh, with reuse detection that revokes the whole token family.
- XP awards are idempotent through a unique key on `(user, reason, source)`; daily caps and analytics buckets use the Asia/Jakarta timezone.
- Authorization lives in the service layer. Tokens carry the role, so a role change takes effect on the next token (within 15 minutes).

**Frontend** — see [`frontend/README.md`](frontend/README.md).

- Server state lives only in TanStack Query (`queries.ts`, `mutations.ts`, `schemas.ts` per feature); responses are validated with zod.
- Every React component lives in `src/components/<area>/`; `src/features/*` holds data code only; `src/routes/*` holds pages.
- Filters, sorting, pages and tabs live in the URL.
- The access token is kept in memory; the refresh token is in `localStorage`.

## More documentation

- [`task.md`](task.md): tracker and manual verification checklist

## Security notes

- `backend/.env` and `frontend/note.md` contain secrets and demo accounts; never commit them.
- The refresh token in `localStorage` is exposed to XSS; Markdown is rendered without raw HTML to reduce that risk. Moving it to an `HttpOnly` cookie is still planned.
