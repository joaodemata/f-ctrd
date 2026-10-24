# F-CTRD

[English](#english) · [Español](#español)

---

## English

F-CTRD is the web frontend of [C-TRD](https://github.com/joaodemata/c-trd), the core that raises **medium and long term market opportunities**. It lets you follow opportunities, manage triggers and conditions, upload Google Trends data, and read how the whole system works. It only consumes the C-TRD HTTP API: it has no backend or database of its own.

### Stack

- Node 18.17+
- React 18.3 + TypeScript 5.6 (strict, `noUncheckedIndexedAccess`)
- Vite 5.4 (`@vitejs/plugin-react` 4), the last versions that support Node 18
- No UI kit, router, state or data-fetching library: plain React, hash navigation and one stylesheet (`src/styles.css`) with light and dark mode

### Screens

| Route | Screen | What it does |
| --- | --- | --- |
| `#/` | Oportunidades | Opportunities dashboard: totals per status, search, date range, pagination and expandable detail (prices, stop loss / take profit, conditions). Auto-refresh |
| `#/triggers` | Triggers | Active triggers with expandable detail. Edit a trigger, or open its version history |
| `#/triggers/versiones?id=` | Versiones | Every version of a trigger, newest first, with the fields that changed marked |
| `#/triggers/nuevo` | Nuevo trigger | Creates a trigger and shows the webhook and alert body for TradingView |
| `#/condiciones` | Condiciones | Creates a condition (API, parameters, callback, interval) and lists the existing ones |
| `#/google-trends` | Google Trends | Uploads the Google Trends CSV of an asset |
| `#/ayuda` | Ayuda | Functional help: opportunity life cycle, conditions, callbacks, how to combine conditions into signals, and the live callback catalog |

### How it works

```
React components ──► hooks (useApiQuery / useApiMutation) ──► src/api/<resource>.ts ──► client.ts ──► C-TRD
        ▲                                                                                   │
        └──────────────── ApiResult<T>: { ok: true, data } | { ok: false, error: ApiError } ◄┘
```

- **Every request goes through `src/api/client.ts`** (timeout, abort, query serialization, response parsing). Components never call `fetch`.
- **Endpoint functions never throw**: they return `ApiResult<T>`. Check `result.ok` before reading `result.data`; on failure `result.error` is an `ApiError` with `kind` (`validation | api | network | timeout | aborted | parse`), `message`, `tracking`, `httpStatus` and `fieldErrors`.
- **Reads** use `useApiQuery(fetcher, deps, { pollIntervalMs })`: loading/refreshing/error state, abort on unmount, and it keeps the last good data while refreshing. Polling pauses while the tab is hidden.
- **Writes** use `useApiMutation(mutator)`: `run(input)`, `isPending`, `data`, `error`.
- **Errors** are shown with `ErrorBanner` (message, field details and tracking code). Form validation errors from C-TRD are shown next to their field.
- **Tracking codes** created by the frontend follow the C-TRD format with an `F` prefix (`FAPICLE001`...).

### Project layout

| Path | Purpose |
| --- | --- |
| `src/main.tsx`, `src/App.tsx` | Entry point and the `ROUTES` table (routes and navbar) |
| `src/api/` | The only code that talks to the network: `client.ts`, `errors.ts`, `types.ts`, `config.ts` and one file per C-TRD resource |
| `src/models/` | TypeScript mirrors of the C-TRD models (json tags) and catalogs |
| `src/hooks/` | `useApiQuery`, `useApiMutation`, `useHashRoute` / `useHashParams`, `useDebouncedValue` |
| `src/components/` | One `*Page.tsx` per screen plus shared pieces (`TriggerForm`, `FormField`, `AssetPicker`, `CatalogSelect`, `ConditionPicker`, `ErrorBanner`...) |
| `src/utils/format.ts` | Date, price, duration and regex helpers |
| `src/styles.css` | Colors as CSS variables with a dark-mode override; status colors come from `data-status="<TAG>"` |

### C-TRD endpoints used

| Method | Path | Used by |
| --- | --- | --- |
| `GET` | `/list/opportunities` | Dashboard (list and per-status totals) |
| `GET` | `/list/triggers` | Triggers and versions (`showReferences`, `tagStatus`, `idReferenceRoot`) |
| `GET` | `/list/conditions` | Conditions list and condition picker |
| `GET` | `/list/assets` | Asset picker |
| `GET` | `/list/apis` | Condition form and help catalog |
| `GET` | `/list/callbacks?responseFormat=` | Callback select and help catalog |
| `GET` | `/list/catalogs?typeCatalog=` | Actions and candle timeframes |
| `POST` | `/operation/create/trigger` | New trigger |
| `PUT` | `/operation/update/trigger` | Edit trigger (creates a new version with a new id) |
| `POST` | `/operation/create/condition` | New condition |
| `POST` | `/operation/google_trends/upload` | Google Trends CSV upload (multipart) |

### Getting started

**Requirements**

- Node 18.17+
- C-TRD running (`go run .` or `air` inside C-TRD), by default on `http://localhost:8080`

**Environment variables**

Copy `.env.example` to `.env.local`:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the C-TRD server | `http://localhost:8080` |
| `VITE_POLL_INTERVAL_MS` | Dashboard auto-refresh in milliseconds, `0` disables it | `30000` |

**CORS:** it is configured in C-TRD (`common/cors.go`). Allowed origins come from `JM_CTRD_CORS_ORIGINS` (comma-separated) and default to `http://localhost:5173`. Serving the frontend from another origin means adding it there.

**Run**

```bash
npm install
npm run dev          # http://localhost:5173
```

**Other commands**

```bash
npm run typecheck    # tsc only
npm run build        # tsc + production build into dist/
npm run preview      # serve dist/ locally
```

`dist/` is a static site; hash navigation works on any static server.

### Adding a C-TRD endpoint

1. Mirror any new model in `src/models/`, keeping the field names identical to the Go json tags.
2. Add a typed function to `src/api/<resource>.ts`, named after the action (`listTriggers`, `updateTrigger`...), returning `Promise<ApiResult<T>>`.
3. Use it from a component through `useApiQuery` (reads) or `useApiMutation` (writes).
4. For a new screen, create a `*Page.tsx` and add it to `ROUTES` in `App.tsx`. Detail routes use `navPath` so they stay out of the navbar.

### Conventions

- **Language:** code and identifiers in English; comments, UI texts and commit messages in Spanish (same as C-TRD).
- **Models follow C-TRD:** when a C-TRD model or response changes, update `src/models/` in the same change.
- **Search:** `/list/opportunities` uses `search` as a regex, so user text is escaped with `escapeRegex`. The other lists escape it themselves and receive it as typed.
- **Dates:** C-TRD stores UTC; the UI shows local time. Go's zero time (`0001-01-01...`) is shown as empty.
- **Dependencies:** none are added without discussing it first.

---

## Español

F-CTRD es el frontend web de [C-TRD](https://github.com/joaodemata/c-trd), el core que levanta **oportunidades de mercado a mediano y largo plazo**. Permite seguir las oportunidades, administrar triggers y condiciones, subir datos de Google Trends y entender cómo funciona todo el sistema. Solo consume la API HTTP de C-TRD: no tiene backend ni base de datos propios.

### Stack

- Node 18.17+
- React 18.3 + TypeScript 5.6 (strict, `noUncheckedIndexedAccess`)
- Vite 5.4 (`@vitejs/plugin-react` 4), las últimas versiones que soportan Node 18
- Sin librería de UI, router, estado ni data fetching: React puro, navegación por hash y una sola hoja de estilos (`src/styles.css`) con modo claro y oscuro

### Pantallas

| Ruta | Pantalla | Qué hace |
| --- | --- | --- |
| `#/` | Oportunidades | Dashboard de oportunidades: totales por estado, búsqueda, rango de fechas, paginación y detalle desplegable (precios, stop loss / take profit, condiciones). Se refresca solo |
| `#/triggers` | Triggers | Triggers activos con detalle desplegable. Permite editar un trigger o abrir su historial de versiones |
| `#/triggers/versiones?id=` | Versiones | Todas las versiones de un trigger, la más reciente primero, con los campos que cambiaron marcados |
| `#/triggers/nuevo` | Nuevo trigger | Crea un trigger y muestra el webhook y el body de la alerta para TradingView |
| `#/condiciones` | Condiciones | Crea una condición (API, parámetros, callback, intervalo) y lista las existentes |
| `#/google-trends` | Google Trends | Sube el CSV de Google Trends de un asset |
| `#/ayuda` | Ayuda | Ayuda funcional: ciclo de vida de las oportunidades, condiciones, callbacks, cómo combinar condiciones en señales y el catálogo de callbacks en vivo |

### Cómo funciona

```
Componentes React ──► hooks (useApiQuery / useApiMutation) ──► src/api/<recurso>.ts ──► client.ts ──► C-TRD
        ▲                                                                                      │
        └────────────────── ApiResult<T>: { ok: true, data } | { ok: false, error: ApiError } ◄┘
```

- **Toda petición pasa por `src/api/client.ts`** (timeout, cancelación, serialización del query, parseo de la respuesta). Los componentes nunca llaman a `fetch`.
- **Las funciones de endpoint nunca lanzan excepciones**: retornan `ApiResult<T>`. Revisa `result.ok` antes de leer `result.data`; si falla, `result.error` es un `ApiError` con `kind` (`validation | api | network | timeout | aborted | parse`), `message`, `tracking`, `httpStatus` y `fieldErrors`.
- **Las lecturas** usan `useApiQuery(fetcher, deps, { pollIntervalMs })`: estado de carga/refresco/error, cancelación al desmontar, y conserva los últimos datos buenos mientras refresca. El polling se pausa con la pestaña oculta.
- **Las escrituras** usan `useApiMutation(mutator)`: `run(input)`, `isPending`, `data`, `error`.
- **Los errores** se muestran con `ErrorBanner` (mensaje, detalle por campo y tracking code). Los errores de validación de C-TRD se muestran junto a su campo.
- **Los tracking codes** propios del frontend siguen el formato de C-TRD con prefijo `F` (`FAPICLE001`...).

### Estructura del proyecto

| Ruta | Propósito |
| --- | --- |
| `src/main.tsx`, `src/App.tsx` | Punto de entrada y la tabla `ROUTES` (rutas y barra de navegación) |
| `src/api/` | El único código que habla con la red: `client.ts`, `errors.ts`, `types.ts`, `config.ts` y un archivo por recurso de C-TRD |
| `src/models/` | Espejos en TypeScript de los modelos de C-TRD (tags json) y catálogos |
| `src/hooks/` | `useApiQuery`, `useApiMutation`, `useHashRoute` / `useHashParams`, `useDebouncedValue` |
| `src/components/` | Un `*Page.tsx` por pantalla más piezas compartidas (`TriggerForm`, `FormField`, `AssetPicker`, `CatalogSelect`, `ConditionPicker`, `ErrorBanner`...) |
| `src/utils/format.ts` | Helpers de fechas, precios, duraciones y regex |
| `src/styles.css` | Colores como variables CSS con override para modo oscuro; los colores de estado salen de `data-status="<TAG>"` |

### Endpoints de C-TRD que usa

| Método | Ruta | Lo usa |
| --- | --- | --- |
| `GET` | `/list/opportunities` | Dashboard (listado y totales por estado) |
| `GET` | `/list/triggers` | Triggers y versiones (`showReferences`, `tagStatus`, `idReferenceRoot`) |
| `GET` | `/list/conditions` | Listado de condiciones y selector de condiciones |
| `GET` | `/list/assets` | Selector de asset |
| `GET` | `/list/apis` | Formulario de condición y catálogo de la ayuda |
| `GET` | `/list/callbacks?responseFormat=` | Selector de callback y catálogo de la ayuda |
| `GET` | `/list/catalogs?typeCatalog=` | Acciones y temporalidades de vela |
| `POST` | `/operation/create/trigger` | Nuevo trigger |
| `PUT` | `/operation/update/trigger` | Editar trigger (crea una versión nueva con otro id) |
| `POST` | `/operation/create/condition` | Nueva condición |
| `POST` | `/operation/google_trends/upload` | Subida del CSV de Google Trends (multipart) |

### Primeros pasos

**Requisitos**

- Node 18.17+
- C-TRD corriendo (`go run .` o `air` dentro de C-TRD), por defecto en `http://localhost:8080`

**Variables de entorno**

Copia `.env.example` a `.env.local`:

| Variable | Descripción | Por defecto |
| --- | --- | --- |
| `VITE_API_BASE_URL` | URL base del servidor C-TRD | `http://localhost:8080` |
| `VITE_POLL_INTERVAL_MS` | Refresco automático del dashboard en milisegundos, `0` lo desactiva | `30000` |

**CORS:** se configura en C-TRD (`common/cors.go`). Los orígenes permitidos salen de `JM_CTRD_CORS_ORIGINS` (separados por coma) y por defecto es `http://localhost:5173`. Servir el frontend desde otro origen implica agregarlo ahí.

**Ejecutar**

```bash
npm install
npm run dev          # http://localhost:5173
```

**Otros comandos**

```bash
npm run typecheck    # solo tsc
npm run build        # tsc + build de producción en dist/
npm run preview      # sirve dist/ en local
```

`dist/` es un sitio estático; la navegación por hash funciona en cualquier servidor estático.

### Agregar un endpoint de C-TRD

1. Replica el modelo nuevo en `src/models/`, con los nombres de campo idénticos a los tags json de Go.
2. Agrega una función tipada en `src/api/<recurso>.ts`, con el nombre de la acción (`listTriggers`, `updateTrigger`...), que retorne `Promise<ApiResult<T>>`.
3. Úsala desde un componente con `useApiQuery` (lecturas) o `useApiMutation` (escrituras).
4. Para una pantalla nueva, crea un `*Page.tsx` y agrégalo a `ROUTES` en `App.tsx`. Las rutas de detalle usan `navPath` para no salir en la barra.

### Convenciones

- **Idioma:** código e identificadores en inglés; comentarios, textos de la UI y mensajes de commit en español (igual que C-TRD).
- **Los modelos siguen a C-TRD:** cuando cambia un modelo o una respuesta de C-TRD, se actualiza `src/models/` en el mismo cambio.
- **Búsqueda:** `/list/opportunities` usa `search` como regex, así que el texto del usuario se escapa con `escapeRegex`. Los demás listados lo escapan ellos mismos y lo reciben tal cual.
- **Fechas:** C-TRD guarda en UTC; la UI muestra la hora local. La fecha cero de Go (`0001-01-01...`) se muestra vacía.
- **Dependencias:** no se agregan sin conversarlo antes.
