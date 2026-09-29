import { Link } from '@tanstack/react-router'
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/menu'
import type { Env } from '@/lib/data/types'
import { navItems } from './nav-items'
import { Dot } from './status'
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
export function EnvSwitcher({ env, environments }: { env: Env; environments: Array<{ env: Env; status: 'available' | 'unavailable' }> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-foreground outline-none hover:bg-nav-hover focus-visible:outline-2 focus-visible:outline-ring">
        <BrandMark />
        <span className="text-[15px] font-semibold">phlo</span>
        <EnvPill env={env} />
        <ChevronDownIcon className="ml-auto size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]">
        <DropdownMenuLabel>Environments with access</DropdownMenuLabel>
        {environments.map((item) => (
          <DropdownMenuItem
            key={item.env}
            render={<Link to={item.env === 'prod' ? '/' : '/staging'} />}
            className={cn('items-center', env === item.env && 'bg-soft')}
          >
            <Dot tone={item.status === 'available' ? 'ok' : 'neutral'} size="md" />
            <span className="flex-1 font-medium">{item.env}</span>
            <span className="text-xs text-muted-foreground">{item.status}</span>
            {env === item.env ? <CheckIcon className="size-3.5 text-link" /> : null}
          </DropdownMenuItem>
        ))}
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
  openIncidentCount,
  services,
  environments,
}: {
  env: Env
  openIncidentCount: number
  services: Array<{ name: string; status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'; observedAt: string | null; responseTimeSeconds: number | null }>
  environments: Array<{ env: Env; status: 'available' | 'unavailable' }>
}) {
  const staging = env === 'staging'
  return (
    <nav aria-label="Primary" className="flex h-full w-[248px] shrink-0 flex-col gap-[18px] px-2.5 py-3.5">
      <EnvSwitcher env={env} environments={environments} />
      <QuickActionsButton />

      <div className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, Icon, exact }) => {
          const target = staging
            ? to === '/'
              ? '/staging'
              : to === '/incidents' || to === '/query'
                ? `${to}?env=staging`
                : to
            : to
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
              {to === '/incidents' && openIncidentCount > 0 ? (
                <span className="ml-auto rounded-[5px] bg-bad px-1.5 py-px text-xs text-white">{openIncidentCount}</span>
              ) : null}
              {staging && to !== '/' && to !== '/settings' && to !== '/incidents' && to !== '/query' ? (
                <span className="ml-auto rounded border border-border px-1.5 text-[11px] text-muted-foreground">preview</span>
              ) : null}
            </Link>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="px-2.5 text-xs tracking-wide text-muted-foreground">Open incidents · {env}</div>
        <Link to="/incidents" className="px-2.5 text-[13.5px] leading-normal text-text-3 hover:text-foreground">
          {openIncidentCount} open or acknowledged
        </Link>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-border px-2.5 pt-3 pb-1">
        <div className="text-xs tracking-wide text-muted-foreground">Services · {env}</div>
        {services.map((s) => {
          const tone = s.status === 'healthy' ? 'ok' : s.status === 'degraded' ? 'warn' : s.status === 'unhealthy' ? 'bad' : 'neutral'
          return (
            <div key={s.name} className="flex items-center gap-2 text-[13px] text-text-2" title={s.observedAt ? `Observed ${s.observedAt}` : 'No observation'}>
              <Dot tone={tone} />
              {s.name}
              <span className="ml-auto font-mono text-xs text-muted-foreground">{s.status}</span>
            </div>
          )
        })}
        <ThemeSwitch className="mt-1" />
      </div>
    </nav>
  )
}
