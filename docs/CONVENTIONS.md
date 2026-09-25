# phlo web — conventions

TanStack Start (file routes, server functions) + shadcn-style components on **Base UI** + Tailwind v4.
The original design boards live in `design-reference/*.dc.html` (open them in a text editor — they are the spec).

## Layout

```
src/
  styles.css                 tokens (light + .dark) → Tailwind colours
  routes/__root.tsx          html shell, theme script, providers
  routes/_app.tsx            app shell: sidebar (lg+), phone top bar + tab bar (< lg), main panel
  routes/_app/**             one file per screen
  components/ui/*            shadcn-style primitives on @base-ui/react (Button, Badge, Card, Dialog,
                             DropdownMenu, Popover, Tooltip, Tabs, Segmented, Checkbox, CheckLine,
                             RadioGroup, ChoiceItem, OptionCard, Switch, Select, Input, Textarea,
                             Field/FieldLabel/FieldDescription, Avatar, Table, Separator, Skeleton, Kbd)
  components/phlo/*          app pieces: PageHeader, PageBody, Eyebrow, Meta, KeyValues, KpiCard, Stat,
                             Timeline/TimelineItem/TimelineComment, EmptyState, PageSkeleton,
                             Dot, SeverityBadge, IncidentStatusText, IncidentStatusBadge, IncidentTile,
                             LayerSwatch, LayerLabel, HealthBar, RunStrip, RunLegend, DayStrip, Mono, RichText
  components/<area>/*        components used by one area only
  lib/data/types.ts          domain types
  lib/data/fixtures/*.ts     mock data (core.ts is shared; one file per area for the rest)
  lib/data/api/*.ts          createServerFn wrappers — the ONLY thing routes call for data
```

## Rules

- **Colours only through tokens.** Tailwind classes like `bg-card`, `text-muted-foreground`, `border-line`,
  `bg-bad-soft text-bad-ink`, `bg-warn-bar`, `bg-ok`, `text-link`, `bg-bronze`… Never hex, never Tailwind's
  default palette (`red-500`, `gray-100`). Both themes come for free.
- **Status language:** bad (red) = broken/blocking · warn (amber) = at risk or waiting on a person ·
  ok (green) = healthy · branch (purple) = branches/versions · info (blue) = informational/in progress ·
  neutral (grey) = skipped/draft. Anything not prod is amber (`env-stripe`, `EnvPill`).
- **Data:** routes load with `loader: () => getX()` (server functions in `lib/data/api`). Screen-specific
  mock data goes in `lib/data/fixtures/<area>.ts` with its server fn in `lib/data/api/<area>.ts`. Keep the
  story numbers consistent with `fixtures/core.ts`.
- **Every page:** `<PageHeader …/>` then `<PageBody>` (or your own scroll areas). `head: () => ({ meta: [{ title: '… · phlo' }] })`.
- **Responsive:** design for 1440×960 desktop and 390×844 phone. Below `lg` the sidebar is hidden and a tab
  bar shows; pages must stack (grid → single column), tables become card lists or scroll horizontally inside
  their card, side panels move below content. No horizontal page scroll on phones. Touch targets ≥ 40px.
- **Accessibility:** real `<button>` / `<a>` (`Link`), labels on inputs (`Field` + `FieldLabel`), `aria-label`
  on icon-only buttons, `role="img"` + `aria-label` on charts. Focus rings come from the base styles.
- **Dialogs** (new incident, new branch, add audit, materialize, sign & merge) open from a search param
  (`?dialog=new-incident`) so they're linkable; close by navigating the param away.
- **Names stay exact:** tables, columns, IDs, commits in `font-mono` (`<Mono>`), never truncated mid-word
  except with an ellipsis.
- **Charts:** anything with axes goes through `ChartContainer` (Recharts) with a `label`; colours are token vars in
  `ChartConfig`; `isAnimationActive={false}`. Graphs use React Flow inside `.phlo-flow`, rendered in `ClientOnly`.
  Status cell strips (RunStrip, DayStrip, HealthBar) stay plain divs.
- British English, plain words.
