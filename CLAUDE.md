# F-CTRD

F-CTRD is the web frontend of C-TRD (`C:\Users\pc\projects\C-TRD`). It only consumes the C-TRD HTTP API; it has no backend or database of its own.

## Stack

- Node 18.17 (pinned versions below are the last ones that support it: Vite 5, plugin-react 4)
- React 18.3 + TypeScript 5.6 (strict, `noUncheckedIndexedAccess`)
- Vite 5.4
- No UI kit, router, state or data-fetching library: plain React + `src/styles.css`

## Commands

```bash
npm install          # install deps
npm run dev          # dev server on http://localhost:5173 (strictPort)
npm run typecheck    # tsc only
npm run build        # tsc + production build into dist/
```

C-TRD must be running on `VITE_API_BASE_URL` (default `http://localhost:8080`): `go run .` inside C-TRD.

## Configuration

Copy `.env.example` to `.env.local`:

- `VITE_API_BASE_URL`: base URL of the C-TRD server
- `VITE_POLL_INTERVAL_MS`: dashboard auto-refresh, `0` disables it. Polling pauses while the tab is hidden

CORS lives in C-TRD (`common/cors.go`). The allowed origins come from `JM_CTRD_CORS_ORIGINS` (comma-separated) and default to `http://localhost:5173`. Serving the frontend from another origin means adding it there.

## Project layout

- `src/api/`: the only place that talks to the network
  - `types.ts`: `ApiResponse<T>` (mirror of C-TRD `APIResponse`), `ApiResult<T>`, `RequestOptions`
  - `errors.ts`: `ApiError` and the converters from a FAIL response or from a fetch exception
  - `client.ts`: `request()` / `api.get|post|put|patch|delete`: timeout, abort, query serialization, response parsing
  - `config.ts`: reads `VITE_*` env vars
  - `<resource>.ts`: one file per C-TRD resource (e.g. `opportunities.ts`) with typed endpoint functions
- `src/models/`: TypeScript mirrors of the C-TRD models (`models/*.go` json tags) and catalogs (`common/constants.go`)
- `src/hooks/useApiQuery.ts`: standard hook for reads: loading/refreshing/error state, abort on unmount, polling
- `src/hooks/useApiMutation.ts`: standard hook for writes (create, upload): `run(input)`, pending/error/data, abort on unmount
- `src/hooks/useHashRoute.ts`: hash navigation (`#/triggers/nuevo`); `useHashParams()` reads params after the path (`#/triggers/versiones?id=...`). Routes and navbar items are the `ROUTES` table in `App.tsx`; routes with `navPath` are detail views hidden from the navbar
- `src/components/`: UI. One `*Page.tsx` per route: `Dashboard.tsx` (opportunities, owns filters/pagination), `TriggersPage.tsx` (active triggers, detail and edit via `TriggerEdit`), `TriggerVersionsPage.tsx` (all versions of one trigger), `TriggerPage.tsx` (create), `ConditionPage.tsx`, `GoogleTrendsPage.tsx`, `HelpPage.tsx` (functional help: opportunity life cycle, conditions, callbacks; it describes C-TRD behavior, so update it when the hook, the cronjobs or the callbacks change). Shared form pieces: `FormField`, `TriggerForm` (create and update), `AssetPicker`, `CatalogSelect`, `ConditionPicker`, `ApiParameterInput`
- `src/utils/format.ts`: date, price and regex helpers

## Request / response contract

- Every call goes through `src/api/client.ts`. Components and hooks never call `fetch` directly.
- Endpoint functions return `Promise<ApiResult<T>>` and **never throw**. Always check `result.ok` before reading `result.data`; on failure read `result.error` (an `ApiError`). This mirrors the C-TRD rule that an `*ErrorHandler` is never nil.
- `ApiError` fields: `kind` (`validation | api | network | timeout | aborted | parse`), `message`, `tracking`, `httpStatus`, `fieldErrors` (field -> message, from C-TRD `data.<field>.details`), `details`.
- Errors produced by the frontend itself use tracking codes with the C-TRD format, prefixed with `F` (`FAPICLE001`...). Each code is unique; add new ones to `FrontendTracking` in `errors.ts`.
- Show errors with `components/ErrorBanner.tsx` so message, field details and tracking code look the same everywhere. `aborted` errors are ignored by `useApiQuery`.
- For reads use `useApiQuery(fetcher, deps, { pollIntervalMs })`; it keeps the last good `data` while refreshing or after a failed refresh.

## C-TRD API notes

- Envelope: `{ status: "SUCCESS" | "FAIL", message, tracking, date, data }`. Success codes vary (`/list/opportunities` answers 202); errors are 400 (403 for local-only routes or a rejected CORS preflight).
- GET routes read their params from the query string (`in:"query"` in the C-TRD format validates). Dates are `YYYY-MM-DD` or RFC3339; slices are repeated params.
- `/list/opportunities`, `/list/apis`, `/list/assets`, `/list/conditions` and `/list/triggers` return the total of matching documents in `data.page` (not the page number). `/list/catalogs?typeCatalog=` and `/list/callbacks?responseFormat=` are not paginated. A callback's `id` is what goes in `callbackFunction`; `name` is only a label.
- Form validation errors come back in `ApiError.fieldErrors` keyed by the JSON field name of the body; forms show them next to the field and fall back to `ErrorBanner` for the rest.
- `/operation/google_trends/upload` is multipart (`idAsset` + `file`, `.csv`, max 1 MB): pass a `FormData` as body and `client.ts` leaves the `Content-Type` to the browser.
- `/list/triggers` only returns active triggers unless `showReferences=true`, which adds inactive and replaced versions and allows `tagStatus`; a non-active `tagStatus` without `showReferences` is rejected (DVLIS003). `idReferenceRoot` limits it to the versions of one trigger (the original and every version pointing to it); the trigger list only shows active ones and the versions view uses `showReferences` + `idReferenceRoot`.
- Some old triggers store the zero ObjectID (`000000000000000000000000`) instead of `null` in `idReference`/`idReferenceRoot`; use `previousTriggerId` / `triggerRootId` from `models/trigger.ts`.
- `PUT /operation/update/trigger` does not edit in place: it inactivates and logically deletes the trigger and creates a new version with a new id (`idReference`/`idReferenceRoot`). Only the active version can be updated. The new version keeps `idWebhook`, so the TradingView alert does not change.
- `POST /operation/create/condition` takes `tag` (unique among non-deleted conditions, DVOPR020), `name`, `description`, `idTypeCondition` (catalog `TYPE_CONDITION`) and `parametersCallback` (text values validated against the callback's `parameters` from `/list/callbacks`, like the API `parameters`). Conditions embedded in triggers and opportunities still use `nameCondition` / `descriptionCondition`.
- Trigger timeframes must have a known duration in C-TRD (`common/parsers.go`), mirrored in `TIMEFRAME_MINUTES` (`models/catalog.ts`).
- On `/list/opportunities`, `search` is used by C-TRD as a case-insensitive Mongo regex over `asset`, `action`, `status` and `tag_trigger`. Escape user text with `escapeRegex`. The other lists escape `search` themselves (literal match), so send it as typed. The status filter sends the anchored status **name** (`^Activa$`), not the tag.
- Status counts are N calls with `limit=1` (one per status), because C-TRD has no aggregate endpoint.
- JSON keys are camelCase; keep the TS models identical to the Go json tags. Fields with `json:"-"` (API request config, condition `metadata`/`httpRequest`, audit fields) never reach the frontend.
- The TradingView hook body uses `idWebhook`, not `idTrigger`. C-TRD only returns `idWebhook` from create/update trigger, not from `/list/triggers`.
- Times are UTC; `0001-01-01...` is Go's zero time and is shown as empty (`parseApiDate`).
- `/operation/google_trends/series` is local-only (C-TRD `LocalOnlyMiddleware`); the browser cannot use it.
- The `/ws` WebSocket exists but nothing broadcasts on it yet, so the dashboard polls.

## Conventions

- Language: code and identifiers in English; comments, UI texts and commit messages in Spanish (same as C-TRD).
- One endpoint function per C-TRD route in `src/api/<resource>.ts`, named after the action (`listOpportunities`, `createTrigger`...).
- When a C-TRD model or response changes, update `src/models/` in the same change.
- Colors are CSS variables in `styles.css` with a dark-mode override; status colors are driven by `data-status="<TAG>"`.

## Rules for Claude

- Run `npm run build` before saying a task is done, and check the change in the browser against a running C-TRD when it touches the UI.
- Don't add dependencies without asking (there is no test runner yet; ask before adding Vitest).
- Don't edit `.env*` files other than `.env.example`.
- Changes needed in C-TRD (new endpoints, CORS, query params) follow C-TRD's own `CLAUDE.md` and are done in that repository.
- Make small, focused changes; don't refactor unrelated code.
