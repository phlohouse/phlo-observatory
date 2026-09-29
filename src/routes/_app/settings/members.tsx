import { createFileRoute } from '@tanstack/react-router'
import { getAdminIdentity } from '@/lib/data/api/admin'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { Mono } from '@/components/phlo/status'
import { SettingsFrame } from '@/components/settings/frame'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings/members')({
  loader: () => getAdminIdentity(),
  head: () => ({ meta: [{ title: 'Members and access · phlo' }] }),
  component: MembersPage,
})

const peopleGrid = 'md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_100px] md:items-center md:gap-x-3.5'
const serviceGrid = 'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:items-center md:gap-x-3.5'

function MembersPage() {
  const data = Route.useLoaderData()
  const active = data.members.filter((member) => member.active).length

  return (
    <SettingsFrame
      header={
        <PageHeader
          crumbs={[{ label: 'Settings', to: '/settings' }]}
          title="Members and access"
          actions={<Button disabled title="Creating invitations is disabled in this preview">Invite unavailable</Button>}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col gap-[26px] p-4 xl:overflow-y-auto lg:px-6 lg:py-5">
          <p role="status" className="m-0 rounded-lg border border-warn-line bg-warn-wash px-3 py-2 text-sm text-warn-ink">Identity records are loaded from Phlo. Role changes, invitations, and service-account actions are disabled in this read-only preview.</p>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2.5 pb-2">
              <h2 className="m-0 text-[15px] font-medium">People</h2>
              <span className="text-[13px] text-muted-foreground">{active} active · {data.members.length - active} inactive</span>
            </div>
            <div role="table" aria-label="People" className="flex flex-col">
              <div role="row" className={cn(peopleGrid, 'hidden h-[34px] border-b border-line text-xs text-muted-foreground')}>
                <span role="columnheader">Identity</span><span role="columnheader">Roles</span><span role="columnheader">Status</span>
              </div>
              {data.members.map((member) => (
                <div key={member.subject} role="row" className={cn(peopleGrid, 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-line-soft py-3 text-[13.5px] md:min-h-[50px] md:py-2')}>
                  <span role="cell" className="flex min-w-0 flex-col"><span className="break-all" title={member.email ?? member.subject}>{member.email ?? member.subject}{member.subject === data.me.subject ? ' (you)' : ''}</span><Mono className="truncate text-xs text-muted-foreground">{member.subject} · {member.principal_type}</Mono></span>
                  <span role="cell" className="col-start-1 md:col-start-auto"><Roles roles={member.roles} /></span>
                  <span role="cell" className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto"><Badge variant={member.active ? 'ok' : 'neutral'}>{member.active ? 'Active' : 'Inactive'}</Badge></span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2 pb-2"><h2 className="m-0 text-[15px] font-medium">Invitations</h2><span className="text-[13px] text-muted-foreground">Read-only records; invitation tokens are unavailable.</span></div>
            {data.invitations.length === 0 ? <p className="m-0 text-sm text-muted-foreground">No invitations found.</p> : <div role="table" aria-label="Invitations" className="flex flex-col">
              {data.invitations.map((invitation) => <div key={invitation.invitation_id} role="row" className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-1 border-b border-line-soft py-3 text-[13.5px] md:gap-4"><span role="cell" className="min-w-0 break-all">{invitation.email}</span><span role="cell" className="min-w-0"><Roles roles={invitation.roles} /></span><span role="cell" className="col-span-2 min-w-0 text-muted-foreground">{invitation.status} · expires {formatDate(invitation.expires_at)}</span></div>)}
            </div>}
          </div>

          <div id="service-accounts" className="flex scroll-mt-4 flex-col">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2 pb-2"><h2 className="m-0 text-[15px] font-medium">Service accounts</h2><span className="text-[13px] text-muted-foreground">Tokens and rotation details are unavailable.</span><Button variant="outline" size="sm" disabled className="h-10 sm:ml-auto md:h-7">New account unavailable</Button></div>
            {data.serviceAccounts.length === 0 ? <p className="m-0 text-sm text-muted-foreground">No service accounts found.</p> : <div role="table" aria-label="Service accounts" className="flex flex-col">
              <div role="row" className={cn(serviceGrid, 'hidden h-[34px] border-b border-line text-xs text-muted-foreground')}><span role="columnheader">Account</span><span role="columnheader">Roles · status</span></div>
              {data.serviceAccounts.map((account) => <div key={account.subject} role="row" className={cn(serviceGrid, 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line-soft py-3 text-[13.5px] md:min-h-[50px] md:py-2')}><span role="cell" className="flex min-w-0 flex-col"><Mono className="truncate text-[13px]">{account.name}</Mono><Mono className="truncate text-xs text-muted-foreground">{account.subject}</Mono></span><span role="cell" className="flex min-w-0 flex-col items-start gap-1"><Roles roles={account.roles} /><Badge variant={account.active ? 'ok' : 'neutral'}>{account.active ? 'Active' : 'Inactive'}</Badge></span></div>)}
            </div>}
          </div>
        </section>
        <aside aria-label="Current identity" className="flex shrink-0 flex-col border-t border-line bg-raised px-4 py-5 xl:w-[300px] xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-[22px]">
          <Eyebrow className="pb-1">Current identity</Eyebrow><span className="break-words text-[13.5px] font-medium">{data.me.email ?? data.me.subject}</span><Mono className="mt-1 break-all text-xs text-muted-foreground">{data.me.subject}</Mono><span className="mt-3 text-xs text-muted-foreground">{data.me.principal_type} · roles from <Mono className="text-xs">/api/v1/me</Mono></span><div className="mt-2"><Roles roles={data.me.roles} /></div><div className="mt-4 rounded-[10px] border border-primary-line bg-primary-soft px-3.5 py-3 text-[12.5px] leading-normal text-primary-ink">Signing status, teams, and last activity are not exposed by these endpoints.</div>
        </aside>
      </div>
    </SettingsFrame>
  )
}

function Roles({ roles }: { roles: string[] }) { return <span className="text-text-2">{roles.length === 0 ? 'No roles' : roles.join(', ')}</span> }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString() }
