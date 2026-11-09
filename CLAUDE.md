# F-CTRD

F-CTRD is the web frontend of C-TRD (`C:\Users\pc\projects\C-TRD`). It consumes the C-TRD HTTP API and, as the only exception, the public biquote API (economic calendar and market movers, see below); it has no backend or database of its own.

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
- `VITE_POLL_INTERVAL_MS`: dashboard fallback refresh while the `/ws` websocket is down, `0` disables it. Polling pauses while the tab is hidden
- `VITE_BIQUOTE_BASE_URL`: base URL of the public biquote API (default `https://biquote.io`)

CORS lives in C-TRD (`common/cors.go`). The allowed origins come from `JM_CTRD_CORS_ORIGINS` (comma-separated) and default to `http://localhost:5173`. Serving the frontend from another origin means adding it there.

## Deployment

Same branches and promotion flow as C-TRD: `develop` → `qa` → `sandbox` (pre-production) → `production`. A push to one of them runs `.github/workflows/deploy.yml` on the self-hosted runner in the VPS (label `fctrd-vps`): it builds with `VITE_API_BASE_URL` of that environment and publishes `dist/` to `/opt/ctrd/web/<env>`, served by Caddy (`dev.app.`, `qa.app.`, `sandbox.app.`, `app.<domain>`). VPS setup lives in C-TRD `deploy/README.md`.

## Project layout

- `src/api/`: the only place that talks to the network
  - `types.ts`: `ApiResponse<T>` (mirror of C-TRD `APIResponse`), `ApiResult<T>`, `RequestOptions`
  - `errors.ts`: `ApiError` and the converters from a FAIL response or from a fetch exception
  - `client.ts`: `request()` / `api.get|post|put|patch|delete`: timeout, abort, query serialization, response parsing. `externalGet()` is the same for public external APIs (no envelope, no session token)
  - `config.ts`: reads `VITE_*` env vars
  - `session.ts`: session token in `localStorage` (`fctrd.session`); `client.ts` sends it as `Authorization: Bearer` and clears it when C-TRD answers an invalid-session tracking (`INVALID_SESSION_TRACKINGS`)
  - `biquote.ts`: biquote endpoints (`listCalendarEvents`, `listMarketGainers`, `listMarketLosers`); models in `models/biquote.ts`
  - `events.ts`: the `/ws` websocket (URL derived from `VITE_API_BASE_URL`). One shared socket for every subscriber, reconnects with exponential backoff (max 30 s); `ServerEventType` mirrors the C-TRD event constants
  - `<resource>.ts`: one file per C-TRD resource (e.g. `opportunities.ts`) with typed endpoint functions
- `src/models/`: TypeScript mirrors of the C-TRD models (`models/*.go` json tags) and catalogs (`common/constants.go`)
- `src/hooks/useApiQuery.ts`: standard hook for reads: loading/refreshing/error state, abort on unmount, polling
- `src/hooks/useApiMutation.ts`: standard hook for writes (create, upload): `run(input)`, pending/error/data, abort on unmount
- `src/hooks/useServerEvent.ts`: `useServerEvent(typeEvent, onEvent)` calls `onEvent` on that event and after a reconnect (events may have been lost); returns whether the socket is open
- `src/hooks/useMediaQuery.ts`: `useMediaQuery(query)` for layouts that change markup (not just CSS) on small screens
- `src/hooks/useAuth.tsx`: `AuthProvider` (in `main.tsx`) and `useAuth()`: `status`, `user`, `isSuperUser`, `login`, `logout`. Validates the stored token with `/auth/me` on load
- `src/hooks/useHashRoute.ts`: hash navigation (`#/triggers/nuevo`); `useHashParams()` reads params after the path (`#/triggers/versiones?id=...`). Routes and navbar items are the `ROUTES` table in `App.tsx`; routes with `navPath` are detail views hidden from the navbar; routes with `superUser` are hidden from the navbar and render `RestrictedPage` unless the session is the super user. Admin flows (`group: 'admin'` + `description`) go in the navbar's "Administracion" dropdown instead of the bar: add new super-user flows there
- `src/components/`: UI. One `*Page.tsx` per route: `Dashboard.tsx` (opportunities, owns filters/pagination; shows `MarketMoversBanner` on top (ticker moved with `requestAnimationFrame` at 20 px/s plus ‹ › arrows of 240 px, pauses on hover, only the arrows move it under `prefers-reduced-motion`; `$` on every price except `Forex` and `Index`; market type filter `MARKET_TYPES` from `models/biquote.ts` sent as `type`, last choice in `localStorage` `fctrd.marketType`) and `EconomicCalendarPanel` as a collapsible side panel; the title has an "En vivo" badge and the notes inside `InfoPopover` ("i" button). Small screens use different markup, chosen with `useMediaQuery` (`hooks/useMediaQuery.ts`, `PHONE_QUERY` 640px / `NARROW_QUERY` 1000px, same breakpoints as `styles.css`): up to 1000px the calendar is a one-line bar with the next release that opens a `<dialog>` bottom sheet; up to 640px the banner shows one ticker with a Ganadores/Perdedores toggle and the market type as a `<select>`), `TriggersPage.tsx` (active triggers, detail and edit via `TriggerEdit`), `TriggerVersionsPage.tsx` (all versions of one trigger), `TriggerPage.tsx` (create), `ConditionPage.tsx`, `GoogleTrendsPage.tsx`, `AgentThesesPage.tsx` (agents thesis queue), `AgentRunsPage.tsx` (agent runs and their steps, `?idThesis=`), `AgentReviewPage.tsx` (approve/reject what the agents create, `ReviewButtons`), `HelpPage.tsx` (functional help: opportunity life cycle, conditions, callbacks; it describes C-TRD behavior, so update it when the hook, the cronjobs or the callbacks change; the extended guide (TradingView, n8n and other webhook sources, examples, links) is `HelpGuide.tsx`, long parts go in `<More>`/`<details>`, and "Descargar PDF" opens them all and prints with the `@media print` styles). Shared form pieces: `FormField`, `TriggerForm` (create and update), `VisibilityFields` (create trigger and condition), `AssetPicker`, `CatalogSelect`, `ConditionPicker`, `ApiParameterInput`. `RecordAccess` shows owner and visibility in detail panels
- `src/utils/format.ts`: date, price and regex helpers
- `src/utils/calendarNames.ts`: `translateEventName()`, Spanish names for the biquote calendar (English only, no language param). Unknown names fall back to English; add new high-impact releases there. The original name stays as tooltip
- `components/Disclaimer.tsx`: legal notice (no liability for the user's trades, gains or losses) rendered in `App.tsx` under every page

## Request / response contract

- Every call goes through `src/api/client.ts`. Components and hooks never call `fetch` directly.
- Endpoint functions return `Promise<ApiResult<T>>` and **never throw**. Always check `result.ok` before reading `result.data`; on failure read `result.error` (an `ApiError`). This mirrors the C-TRD rule that an `*ErrorHandler` is never nil.
- `ApiError` fields: `kind` (`validation | api | rateLimit | network | timeout | aborted | parse`), `message`, `tracking`, `httpStatus`, `fieldErrors` (field -> message, from C-TRD `data.<field>.details`), `details`, `retryAfterSeconds` (only `rateLimit`).
- Errors produced by the frontend itself use tracking codes with the C-TRD format, prefixed with `F` (`FAPICLE001`...). Each code is unique; add new ones to `FrontendTracking` in `errors.ts`.
- Show errors with `components/ErrorBanner.tsx` so message, field details and tracking code look the same everywhere. `aborted` errors are ignored by `useApiQuery`.
- For reads use `useApiQuery(fetcher, deps, { pollIntervalMs })`; it keeps the last good `data` while refreshing or after a failed refresh.

## C-TRD API notes

- Envelope: `{ status: "SUCCESS" | "FAIL", message, tracking, date, data }`. Success codes vary (`/list/opportunities` answers 202); errors are 400 (403 for local-only routes or a rejected CORS preflight).
- GET routes read their params from the query string (`in:"query"` in the C-TRD format validates). Dates are `YYYY-MM-DD` or RFC3339; slices are repeated params.
- `/list/opportunities`, `/list/apis`, `/list/assets`, `/list/conditions` and `/list/triggers` return the total of matching documents in `data.page` (not the page number). `/list/catalogs?typeCatalog=` and `/list/callbacks?responseFormat=` are not paginated. A callback's `id` is what goes in `callbackFunction`; `name` is only a label.
- Form validation errors come back in `ApiError.fieldErrors` keyed by the JSON field name of the body; forms show them next to the field and fall back to `ErrorBanner` for the rest.
- `/operation/google_trends/upload` is multipart (`idAsset` + `file`, `.csv`, max 1 MB): pass a `FormData` as body and `client.ts` leaves the `Content-Type` to the browser.
- `/list/triggers` only returns active triggers unless `showReferences=true`, which adds inactive and replaced versions and allows `tagStatus`; an inactive `tagStatus` without `showReferences` is rejected (DVLIS003), but `STATUS-PENDING-FOR-APPROVE` and `STATUS-NOT-APPROVED` are allowed (agents review). `idReferenceRoot` limits it to the versions of one trigger (the original and every version pointing to it); the trigger list only shows active ones and the versions view uses `showReferences` + `idReferenceRoot`.
- Some old triggers store the zero ObjectID (`000000000000000000000000`) instead of `null` in `idReference`/`idReferenceRoot`; use `previousTriggerId` / `triggerRootId` from `models/trigger.ts`.
- `PUT /operation/update/trigger` does not edit in place: it inactivates and logically deletes the trigger and creates a new version with a new id (`idReference`/`idReferenceRoot`). Only the active version can be updated. The new version keeps `idWebhook`, so the TradingView alert does not change.
- `POST /operation/create/condition` takes `tag` (unique among non-deleted conditions, DVOPR020), `name`, `description`, `idTypeCondition` (catalog `TYPE_CONDITION`) and `parametersCallback` (text values validated against the callback's `parameters` from `/list/callbacks`, like the API `parameters`). Conditions embedded in triggers and opportunities still use `nameCondition` / `descriptionCondition`.
- Trigger timeframes must have a known duration in C-TRD (`common/parsers.go`), mirrored in `TIMEFRAME_MINUTES` (`models/catalog.ts`).
- On `/list/opportunities`, `search` is used by C-TRD as a case-insensitive Mongo regex over `asset`, `action`, `status` and `tag_trigger`. Escape user text with `escapeRegex`. The other lists escape `search` themselves (literal match), so send it as typed. The status filter sends the anchored status **name** (`^Activa$`), not the tag.
- Status counts are N calls with `limit=1` (one per status), because C-TRD has no aggregate endpoint.
- JSON keys are camelCase; keep the TS models identical to the Go json tags. Fields with `json:"-"` (API request config, condition `metadata`/`httpRequest`, audit fields) never reach the frontend.
- The hook is `POST /hook/trigger` (it was `/hook/trading_view`) and its body uses `idWebhook`, not `idTrigger`. It rejects pending (DVHOOK005) and not approved (DVHOOK006) triggers. C-TRD only returns `idWebhook` from create/update trigger, not from `/list/triggers`.
- Times are UTC; `0001-01-01...` is Go's zero time and is shown as empty (`parseApiDate`).
- Login is optional (`#/login?next=<path>`). `/auth/login` returns `token`, `expiresAt` (12 h) and `user`; `/auth/me` and `/auth/logout` need the token. The super user is `idTypePrivilege` `USER_PRIVILEGE.superUser.id` (`models/user.ts`, mirror of `common/constants.go`). Missing session is 401 (`CMMARE001`), not super user is 403 (`DVAUT006`); an expired session is 401 with a tracking from `INVALID_SESSION_TRACKINGS` (`api/session.ts`). Create/update trigger, create condition and the Google Trends upload need the super user; their pages (triggers, versions, new trigger, conditions, Google Trends) are super-user only in the frontend.
- Triggers, conditions and opportunities carry the creator (`RecordOwner` in `models/user.ts`: `idUser` + `*TypePrivilege`) and a visibility (`RecordVisibility` in `models/visibility.ts`: catalog `TYPE_VISIBILITY` + `allowedUsers`). Create trigger/condition send `idTypeVisibility` and, only for `VISIBILITY_WHITELIST`, `allowedUsers` (active user ids; errors come as `allowedUsers[i]`). Update trigger keeps the previous owner and visibility; opportunities copy them from the trigger. Records created before users have the zero id and empty tags (`hasOwner`, `hasVisibility`).
- `/list/opportunities` has optional session and filters by visibility: without token only public ones, with token also the user's own and whitelists that include them; a bad token is 401, not anonymous. The dashboard refetches when the session user changes. `/list/triggers` is not filtered by visibility (nor `/list/conditions`, which filters by status instead, see the agents note), and `/list/conditions` only projects `idUser` of the owner and no visibility (the rest arrives zeroed). There is no endpoint to list users.
- AI agents (C-TRD `agents/`, Friday runner as the `claude` user with privilege `AGENT`, `USER_PRIVILEGE.agent`): the super user queues theses (`POST /operation/create/agent_thesis`, `GET /list/agent_theses`, `PUT /operation/delete/agent_thesis` only for `THESIS-PENDING`), reads runs (`GET /list/agent_runs`, `tagStatus`, `idThesis`) and reviews (`PUT /operation/review/trigger|condition` with `decision` `APPROVE | REJECT`). Endpoints in `api/agents.ts`, models and catalogs in `models/agent.ts`. Conditions and triggers created by the agent are born `STATUS-PENDING-FOR-APPROVE`; rejected ones stay `STATUS-NOT-APPROVED` (not deleted). Approving a trigger also approves its pending conditions; a condition used by a trigger can only be rejected after the trigger (DVOPR039). `/list/triggers` accepts those two `tagStatus` without `showReferences`; `/list/conditions` has optional session and filters by `tagStatus` (super user only, 403 DVLIS006) or `idStatus`; without session or privilege it only lists active/inactive conditions (other status is 403 DVLIS008), while the super user and the agent see every status. `start_run`/`finish_run` belong to the agent user and are not used here.
- Create/update trigger accept an optional `code` (Pine, max 64 KB) stored as `pineCode`; C-TRD replaces `{{ID_WEBHOOK}}` with the webhook id. On update, omitting it keeps the previous code. Updating a pending trigger makes the new version active.
- `/operation/google_trends/series` is local-only (C-TRD `LocalOnlyMiddleware`); the browser cannot use it.
- `/ws` sends `{ "typeEvent": "OPPORTUNITIES-UPDATED", "data": null }` when opportunities are created or change status (hook and cronjobs), batched by C-TRD in 5 s windows. Events carry no data: the dashboard refetches the list and the status counts with its own session. It has no refresh button; it only polls (`VITE_POLL_INTERVAL_MS`) while the socket is down.
- Rate limit (C-TRD `common/rate_limit.go`): token bucket per IP shared by all the routes of a limiter: 120/min general, 5/min `/auth/login`, 60/min the hook. A rejected request is 429 with tracking `CMMRLE001` and `data.retryAfterSeconds`, mapped to `ApiError` kind `rateLimit`. Every dashboard refresh is 6 requests (list + 5 status counts), so don't add more automatic refetches without accounting for it.

## Conventions

- Language: code and identifiers in English; comments, UI texts and commit messages in Spanish (same as C-TRD).
- One endpoint function per C-TRD route in `src/api/<resource>.ts`, named after the action (`listOpportunities`, `createTrigger`...).
- When a C-TRD model or response changes, update `src/models/` in the same change.
- Colors are CSS variables in `styles.css` with a dark-mode override; status colors are driven by `data-status="<TAG>"`.
- Brand: seedwise.io. The logo is `components/SeedwiseLogo.tsx` (`animated` plays the growth sequence) with colors `--brand-*`; `public/favicon.svg` and `public/seedwise-logo.svg` are static copies of the same paths, so keep them in sync.

## Rules for Claude

- Run `npm run build` before saying a task is done, and check the change in the browser against a running C-TRD when it touches the UI.
- Don't add dependencies without asking (there is no test runner yet; ask before adding Vitest).
- Don't edit `.env*` files other than `.env.example`.
- Changes needed in C-TRD (new endpoints, CORS, query params) follow C-TRD's own `CLAUDE.md` and are done in that repository.
- Make small, focused changes; don't refactor unrelated code.

## biquote API notes

- Public, no key, CORS open to any origin, 15,000 req/min per IP; the browser calls it directly with `externalGet` (it does not go through C-TRD nor spend its rate limit). Docs: https://biquote.io/docs. C-TRD also uses `/api/calendar` in its economic calendar callbacks (`providers/biquote.go`).
- `GET /api/calendar?importance=high` returns a bare array, oldest first, from yesterday to +7 days. `actual`/`forecast`/`previous` are `null` when there is no value (not zero) and come already scaled by `multiplier` (`4.04` + `millions` = 4.04M); `timeMode` other than `exact` means the time is a placeholder. Some releases come repeated with different ids: the panel dedupes by country + name + time.
- `GET /api/market/gainers|losers?limit=` answer `{ period, exchange, type, data: [{ symbol, name, exchange, type, lastPrice, changePercent, volume, high, low }], marketState, asOf }`. The docs say `items`/`description`; the real response uses `data`/`name`, so model the real one.
- Errors are `{ error }` (400) and 429 with `Retry-After`; they map to `ApiError` with trackings `FAPICLE006` / `FAPICLE007`.
