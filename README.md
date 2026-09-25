# phlo web — mission control

The phlo lakehouse mission-control app, built from the design canvas with **TanStack Start**, **shadcn-style components on Base UI**, and **Tailwind v4**. Every screen from the canvas is here, in light and dark mode, for desktop and phone. For now it runs on typed mock data.

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
| `/staging` | Staging overview: differences from prod and promotion |
| `/incidents`, `/incidents/:id` | Incident list; #214, #213, #211, #209, #207 open, #198 resolved (`?dialog=new-incident`) |
| `/assets`, `/assets/:name` | Asset catalogue and detail; tabs in `?tab=`, plus `?dialog=materialize` and `?dialog=add-audit` |
| `/query` | SQL editor, catalog tree, results as a table, chart or plan |
| `/pipelines`, `/pipelines/:job`, `/pipelines/timeline` | Jobs by domain, owner or source; job detail; 24 h run timeline |
| `/branches` | Nessie branches and tags, commit graph (`?dialog=new-branch`, `?dialog=merge`) |
| `/settings`, `/settings/members`, `/settings/audit-log` | Lakehouse settings, members and access, signed audit log |
| `/states` | Gallery of the harder states: running, failed, empty, no permission, offline |

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
  lib/data/fixtures/      mock data
  lib/data/api/           createServerFn wrappers — the only thing routes call for data
design-reference/         the original design boards (.dc.html + theme.css) — the visual spec
docs/CONVENTIONS.md       rules for tokens, status colours, data, responsive design, accessibility
```

Read `docs/CONVENTIONS.md` before adding screens. In short: use colours only through tokens, keep to the fixed status language (bad/warn/ok/branch/info/neutral), fetch data only through server functions, and make every page work at 390 px.

## Switching to real data

Routes never import fixtures directly; they call server functions in `src/lib/data/api/*.ts`, for example:

```ts
export const getIncidents = createServerFn({ method: 'GET' }).handler(async () => incidents)
```

To go live, replace each handler body with a real call and keep the return type from `types.ts`. Server functions run only on the server, so credentials stay out of the browser. Where each part would likely come from:

- **Pipelines, runs, assets, freshness:** Dagster GraphQL (`DAGSTER_URL`)
- **Branches, tags, commits, merges:** Nessie REST API v2 (`NESSIE_URI`)
- **Incidents, members, audit log, settings:** the Postgres metadata DB (`POSTGRES_DSN`)
- **Query:** the engine you use for Iceberg (Trino, DuckDB and so on)

Mutations such as materialize, merge, promote and invite are currently UI-only. Add them as `createServerFn({ method: 'POST' })` functions and call `router.invalidate()` afterwards.

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

- Everything runs on mock data; buttons that change things only update the UI.
- There's no auth yet. The "You" in members is hard-coded as Gareth.
- React Flow shows a small attribution link (MIT licence; it can be hidden with a React Flow Pro subscription).
- Possible shared refactors: a `size` prop on `Stat`; PageHeader actions that collapse into a menu on phones; a title slot on PageHeader; an inverse token for the selected filter chip.
