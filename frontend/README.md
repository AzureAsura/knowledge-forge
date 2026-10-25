# KnoFo — frontend

React 19 + Vite + React Router + TanStack Query. Talks to the Go backend in `../backend`.

## Run

```
cd ../backend && go run .      # API on :8080
npm install
npm run dev                    # app on :5173
```

`npm run build` type-checks and builds; `npm run lint` runs oxlint.

## Config

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Where the app sends API requests |

In dev, Vite proxies `/api` to `http://localhost:8080` and strips the prefix (`vite.config.ts`), so the backend needs no CORS setup. A production host must do the same rewrite, or serve the API from the same origin.

## Conventions

- Server state lives in TanStack Query only; each feature has `queries.ts` / `mutations.ts` / `schemas.ts`. Responses are parsed with zod at the API client.
- Every React component lives in `src/components/<area>/` (`scrolls`, `analytics`, `challenges`, `comments`, `users`, `apprentice`, `shared`, `ui`). `src/features/*` holds only data code (queries, mutations, schemas, permissions); `src/routes/*` holds pages.
- Filters, sort, page and tabs live in the URL.
- The one `useEffect` is the ⌘K hotkey (`src/lib/hotkey.ts`).
- Access token stays in memory; the refresh token is in `localStorage` (`knofo.rt`).
