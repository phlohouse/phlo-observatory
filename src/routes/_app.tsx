import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { getShell } from '@/lib/data/api/core'
import { Sidebar } from '@/components/phlo/sidebar'
import { MobileTabBar, MobileTopBar } from '@/components/phlo/mobile-nav'
import { CommandPaletteProvider } from '@/components/phlo/command-palette'
import { PageSkeleton } from '@/components/phlo/states'

/**
 * App shell. Desktop: 248px sidebar + rounded main panel. Phones (< lg): top bar,
 * full-width panel and a bottom tab bar. Every page renders inside the panel.
 */
export const Route = createFileRoute('/_app')({
  loader: ({ location }) => getShell({ data: { env: resolveEnvironment(location.pathname, location.searchStr) } }),
  pendingComponent: PageSkeleton,
  component: AppLayout,
})

function AppLayout() {
  const { openIncidentCount, services, environments } = Route.useLoaderData()
  const { pathname, searchStr } = useRouterState({ select: (s) => s.location })
  const env = resolveEnvironment(pathname, searchStr)
  const demoMode = import.meta.env.VITE_OBSERVATORY_DEMO === 'true'

  return (
    <CommandPaletteProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <div className="hidden lg:flex">
          <Sidebar env={env} openIncidentCount={openIncidentCount} services={services} environments={environments} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar env={env} />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card lg:my-2 lg:mr-2 lg:rounded-xl lg:border lg:border-border-card">
            {env === 'staging' ? <div className="env-stripe" /> : null}
            {demoMode ? <div role="status" className="shrink-0 border-b border-warn-line bg-warn-wash px-4 py-1.5 text-center text-xs font-medium text-warn-ink">Disposable API demo only · synthetic data; no live Phlo installation is contacted.</div> : null}
            <Outlet />
          </main>
          <MobileTabBar openIncidents={openIncidentCount} />
        </div>
      </div>
    </CommandPaletteProvider>
  )
}

function resolveEnvironment(pathname: string, search: string): 'prod' | 'staging' {
  return pathname.startsWith('/staging') || new URLSearchParams(search).get('env') === 'staging'
    ? 'staging'
    : 'prod'
}
