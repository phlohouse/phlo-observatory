import { Link } from '@tanstack/react-router'
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/menu'
import type { Env, Incident, Service } from '@/lib/data/types'
import { navItems } from './nav-items'
import { Dot, IncidentTile } from './status'
import { ThemeSwitch } from './theme-switch'
import { useCommandPalette } from './command-palette'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[13px] font-semibold text-background', className)}
    >
      φ
    </span>
  )
}

export function EnvPill({ env }: { env: Env }) {
  return (
    <span
      className={cn(
        'rounded-[5px] border px-1.5 py-px text-xs',
        env === 'staging' ? 'border-warn bg-warn-soft font-medium text-warn-ink' : 'border-border-strong text-muted-foreground',
      )}
    >
      {env}
    </span>
  )
}

/** Brand + environment switcher. Anything that isn't prod is amber. */
export function EnvSwitcher({ env, openIncidents }: { env: Env; openIncidents: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-foreground outline-none hover:bg-nav-hover focus-visible:outline-2 focus-visible:outline-ring">
        <BrandMark />
        <span className="text-[15px] font-semibold">phlo</span>
        <EnvPill env={env} />
        <ChevronDownIcon className="ml-auto size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]">
        <DropdownMenuLabel>Switch environment</DropdownMenuLabel>
        <DropdownMenuItem render={<Link to="/" />} className={cn('items-start', env === 'prod' && 'bg-soft')}>
          <Dot tone="neutral" size="md" className="mt-1.5 bg-text-3" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 font-medium">
              prod <Badge variant="bad" size="sm">{openIncidents} open</Badge>
            </span>
            <span className="text-[12.5px] text-muted-foreground">Production · 148 tables · deploy v1.41</span>
          </span>
          {env === 'prod' ? <CheckIcon className="mt-1 size-3.5 text-link" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/staging" />} className={cn('items-start', env === 'staging' && 'bg-soft')}>
          <Dot tone="warn" size="md" className="mt-1.5" />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 font-medium">
              staging <Badge variant="warn" size="sm">4 to promote</Badge>
            </span>
            <span className="text-[12.5px] text-muted-foreground">Nightly copy of prod · deploy v1.42</span>
          </span>
          {env === 'staging' ? <CheckIcon className="mt-1 size-3.5 text-link" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function QuickActionsButton() {
  const { setOpen } = useCommandPalette()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 text-sm text-text-2 hover:bg-raised"
    >
      <SearchIcon className="size-4" />
      <span>Quick actions</span>
      <Kbd className="ml-auto">⌘K</Kbd>
    </button>
  )
}

const itemCls =
  'flex h-[34px] items-center gap-2.5 rounded-[7px] px-2.5 text-sm text-text-2 hover:bg-nav-hover hover:text-foreground'
const activeCls = 'bg-nav-on text-foreground hover:bg-nav-on'

export function Sidebar({
  env,
  openIncidents,
  services,
}: {
  env: Env
  openIncidents: Incident[]
  services: Service[]
}) {
  const staging = env === 'staging'
  const calm = openIncidents.length === 0
  return (
    <nav aria-label="Primary" className="flex h-full w-[248px] shrink-0 flex-col gap-[18px] px-2.5 py-3.5">
      <EnvSwitcher env={env} openIncidents={openIncidents.length} />
      <QuickActionsButton />

      <div className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, Icon, exact }) => {
          const target = staging && to === '/' ? '/staging' : to
          return (
            <Link
              key={to}
              to={target}
              activeOptions={{ exact }}
              className={itemCls}
              activeProps={{ className: activeCls, 'aria-current': 'page' }}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.7} />
              <span className="min-w-0 truncate">{label}</span>
              {to === '/incidents' && !staging && !calm ? (
                <span className="ml-auto rounded-[5px] bg-bad px-1.5 py-px text-xs text-white">{openIncidents.length}</span>
              ) : null}
              {staging && to !== '/' && to !== '/settings' ? (
                <span className="ml-auto rounded border border-border px-1.5 text-[11px] text-muted-foreground">prod</span>
              ) : null}
            </Link>
          )
        })}
      </div>

      {staging ? (
        <div className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 text-xs tracking-wide text-muted-foreground">Blocking promotion</div>
          <Link to="/staging" hash="promote" className={itemCls}>
            <IncidentTile kind="audit" />
            <span className="truncate">qc_potency_v2 · 2 runs failed</span>
          </Link>
          <Link to="/staging" hash="promote" className={itemCls}>
            <IncidentTile kind="schema" />
            <span className="truncate">Contract: elisa_plate_reads</span>
          </Link>
          <p className="m-0 px-2.5 pt-1.5 text-xs leading-snug text-muted-foreground">
            Pages marked <span className="rounded border border-border px-1 text-[11px]">prod</span> open the production view. Staging only has its own overview.
          </p>
        </div>
      ) : calm ? (
        <div className="flex flex-col gap-1.5">
          <div className="px-2.5 text-xs tracking-wide text-muted-foreground">Open incidents</div>
          <p className="m-0 px-2.5 text-[13.5px] leading-normal text-text-3">None open. Last one closed 4 h ago.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 text-xs tracking-wide text-muted-foreground">Open incidents</div>
          {openIncidents.map((i) => (
            <Link
              key={i.id}
              to="/incidents/$incidentId"
              params={{ incidentId: i.id }}
              className={cn(itemCls, 'text-[13.5px]')}
              activeProps={{ className: activeCls }}
            >
              <IncidentTile kind={i.kind} />
              <span className="min-w-0 truncate">
                #{i.id} {i.title}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-border px-2.5 pt-3 pb-1">
        <div className="text-xs tracking-wide text-muted-foreground">{staging ? 'Services · staging' : 'Services'}</div>
        {services.map((s) => {
          const state = staging || calm ? 'up' : s.state
          return (
            <div key={s.name} className="flex items-center gap-2 text-[13px] text-text-2">
              <Dot tone={state === 'up' ? 'ok' : state === 'slow' ? 'warn' : 'bad'} />
              {s.name}
              <span className="ml-auto font-mono text-xs text-muted-foreground">{state}</span>
            </div>
          )
        })}
        <ThemeSwitch className="mt-1" />
      </div>
    </nav>
  )
}
