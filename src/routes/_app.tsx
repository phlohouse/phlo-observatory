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
  loader: () => getShell(),
  pendingComponent: PageSkeleton,
  component: AppLayout,
})

function AppLayout() {
  const { openIncidents, services } = Route.useLoaderData()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const env = pathname.startsWith('/staging') ? 'staging' : 'prod'

  return (
    <CommandPaletteProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <div className="hidden lg:flex">
          <Sidebar env={env} openIncidents={openIncidents} services={services} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar env={env} />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card lg:my-2 lg:mr-2 lg:rounded-xl lg:border lg:border-border-card">
            {env === 'staging' ? <div className="env-stripe" /> : null}
            <Outlet />
          </main>
          <MobileTabBar openIncidents={env === 'staging' ? 0 : openIncidents.length} />
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
