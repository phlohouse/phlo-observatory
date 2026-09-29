# phlo web — mission control

The replacement Phlo Observatory, built with **TanStack Start**, **Base UI**, and **Tailwind v4**. It is being cut over screen by screen to Phlo's canonical `/api/v1` API. Local preview uses a disposable demo API, never a live Phlo installation.

## Run it

Requires Node 20+ and pnpm (`corepack enable`). npm works too.

```bash
pnpm install
pnpm dev          # http://localhost:3000, hot reload
pnpm typecheck    # tsc --noEmit
pnpm build        # → dist/client (static) + dist/server/server.js
pnpm start        # serves the production build on :3000 (vite preview)
```

`pnpm screenshots` takes screenshots of every route in light and dark, at desktop and phone sizes, into `shots/`. It needs a running server and Playwright's Chromium (`npx playwright install chromium`).

## Screens

| Route | Screen |
|---|---|
| `/` | Overview (prod) |
| `/staging` | Independently fetched staging and production overview evidence; promotion remains unavailable |
| `/incidents`, `/incidents/:id` | Environment-scoped incident list, detail, and API timeline |
| `/assets`, `/assets/:name` | Environment-scoped asset catalogue, schema, lineage, and run history |
| `/query` | SQL editor, catalog tree, results as a table, chart or plan |
| `/pipelines`, `/pipelines/:job`, `/pipelines/timeline` | Environment-scoped jobs, schedules, run evidence, logs, patterns, and maintenance windows |
| `/branches` | Environment-scoped refs, commits, diffs, and comparisons; write workflows remain unavailable |
| `/settings`, `/settings/members`, `/settings/audit-log` | Read-only settings and identity records; audit search, verification, and export |

⌘K (or the search button) opens the command palette. At `lg` and wider the sidebar shows. Below `lg` the app switches to the phone layout: a top bar plus a tab bar with Home, Incidents, Assets and Pipelines.

## Structure

```
src/
  styles.css              design tokens (light + .dark) mapped to Tailwind colours
  router.tsx              router factory
  routes/__root.tsx       html shell, no-flash theme script, providers
  routes/_app.tsx         app shell (sidebar / phone bars / main panel)
  routes/_app/**          one file per screen
  components/ui/          shadcn-style primitives on @base-ui/react
  components/phlo/        shared app pieces (PageHeader, KpiCard, RunStrip, SeverityBadge, Sidebar…)
  components/<area>/      pieces used by one area only
  lib/data/types.ts       domain types
  lib/data/fixtures/      design fixtures; not a source for migrated screen data
  lib/data/api/           createServerFn wrappers — the only thing routes call for data
design-reference/         the original design boards (.dc.html + theme.css) — the visual spec
docs/CONVENTIONS.md       rules for tokens, status colours, data, responsive design, accessibility
```

Read `docs/CONVENTIONS.md` before adding screens. In short: use colours only through tokens, keep to the fixed status language (bad/warn/ok/branch/info/neutral), fetch data only through server functions, and make every page work at 390 px.

## API integration status

The shared server-side client in `src/lib/data/api/client.ts` is the integration seam for the canonical Phlo API. Set `PHLO_API_BASE_URL` to the API's HTTPS origin; do not point the app directly at Dagster, Nessie or the query engine. The client forwards the incoming OAuth2 Proxy session cookie to that configured origin, disables caching, and never forwards a browser-supplied `Authorization` header. In local development, `http://localhost` is accepted for a disposable API; production requires HTTPS. See `.env.example`.

Run `pnpm test` for API client and drift-check unit tests. To check a running API's OpenAPI contract, use `PHLO_API_BASE_URL=<disposable-api-origin> pnpm test:api-contract`; to check an OpenAPI document exported from a local disposable API, pass its path as the command's argument. The checker verifies that app-required paths and methods remain present.

Run `pnpm test:browser` with the disposable API and app preview running to verify production/staging separation, read-only identity and audit screens, and stale branch selection. Playwright Chromium must be installed; `CHROME_PATH` can select an existing Chromium binary.

The app uses typed API adapters for the migrated screens and omits mutations that are unavailable or not yet integrated. Do not add local-only substitutes for Phlo actions or reimplement API permissions, signatures, or idempotency in the UI. Promotion stays unavailable while the staging/promotion API is deferred.

## Charts, graphs and editor

| What | Library | Where |
|---|---|---|
| Bar and line charts (runs by hour, rows per run, freshness lag, run durations, query result chart) | Recharts through shadcn's chart wrapper, `components/ui/chart.tsx` | overview, asset overview, #214, #207, query → Chart |
| Lineage and branch graph | React Flow (`@xyflow/react`), themed with `.phlo-flow` in `styles.css` | asset → Lineage, `/branches` |
| SQL editor | CodeMirror 6 with `@codemirror/lang-sql`, which autocompletes table and column names from the catalog; ⌘/Ctrl-Enter runs the query | `/query` |
| 24 h run timeline | Virtualised with `@tanstack/react-virtual` (try `?scale=10` for 1,000+ jobs) | `/pipelines/timeline` |

Run strips, day strips, health bars and proportion bars are still simple divs on purpose. They're coloured cells, not charts.

Chart colours come from `ChartConfig` and must be raw token variables (`var(--bad)`, `var(--ok-bar)`, `var(--bar)`…). Each config key becomes `--color-<key>`, so pick keys that aren't token names (`failed`, `loaded`, not `bad`, `ok`).

On phones the React Flow graphs sit in a sideways-scrolling box rather than pan/zoom, so one-finger drags still scroll the page.

## Components

`components/ui/*` follows shadcn's structure and naming, built on `@base-ui/react`. It was hand-written because the shadcn registry wasn't reachable from the build environment. To pull in more shadcn components, run:

```bash
npx shadcn@latest add <component>
```

`components.json` is already set up for the Base UI style. Check that any new component uses the tokens in `styles.css`.

## Deploying

`pnpm build` produces `dist/server/server.js`, a standard fetch handler (`export default { fetch }`), and static assets in `dist/client`. The quickest option is to run `pnpm start` on a Node host. To target a specific platform (Netlify, Vercel, Cloudflare, Node server), add its adapter or Nitro to `vite.config.ts`, following the TanStack Start hosting docs.

## Known gaps

- This is not yet a complete Wave 9 cutover: some unused design components and fixture files remain, and real-service integration/security/browser checks still need to pass before a cutover PR.
- The preview demo uses disposable API responses and is not evidence of production service connectivity, authorization, or multi-replica behavior.
- Several API actions and evidence fields are not exposed in the UI yet; these are shown as unavailable rather than simulated.
- React Flow shows a small attribution link (MIT licence; it can be hidden with a React Flow Pro subscription).
- Possible shared refactors: a `size` prop on `Stat`; PageHeader actions that collapse into a menu on phones; a title slot on PageHeader; an inverse token for the selected filter chip.
