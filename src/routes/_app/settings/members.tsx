import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { getMembers } from '@/lib/data/api/core'
import { Eyebrow, PageHeader } from '@/components/phlo/page'
import { Mono } from '@/components/phlo/status'
import { SettingsFrame } from '@/components/settings/frame'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Member, Role, ServiceAccount } from '@/lib/data/types'

export const Route = createFileRoute('/_app/settings/members')({
  loader: () => getMembers(),
  head: () => ({ meta: [{ title: 'Members and access · phlo' }] }),
  component: MembersPage,
})

const roles: Role[] = ['Admin, Approver', 'Approver', 'Engineer', 'Viewer']
const roleOptions = roles.map((r) => ({ value: r, label: r }))

const peopleGrid = 'md:grid md:grid-cols-[minmax(0,1.6fr)_112px_146px_84px_92px] md:items-center md:gap-x-3.5'
const serviceGrid = 'md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_130px_80px] md:items-center md:gap-x-3.5'

function MembersPage() {
  const data = Route.useLoaderData()
  const [people, setPeople] = React.useState<Member[]>(data.members)
  const [accounts, setAccounts] = React.useState<ServiceAccount[]>(data.serviceAccounts)
  const active = people.filter((p) => p.lastActive !== 'Pending').length
  const pending = people.length - active

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#service-accounts') {
      document.getElementById('service-accounts')?.scrollIntoView()
    }
  }, [])

  return (
    <SettingsFrame
      header={
        <PageHeader
          crumbs={[{ label: 'Settings', to: '/settings' }]}
          title="Members and access"
          actions={<InviteButton onInvite={(email, role) => setPeople((p) => [...p, { initials: '··', name: email, note: 'Invite sent just now', team: '—', role, canSign: 'no', lastActive: 'Pending' }])} />}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col gap-[26px] p-4 xl:overflow-y-auto lg:px-6 lg:py-5">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2.5 pb-2">
              <h2 className="m-0 text-[15px] font-medium">People</h2>
              <span className="text-[13px] text-muted-foreground">
                {active} members · {pending} pending
              </span>
            </div>
            <div role="table" aria-label="People" className="flex flex-col">
              <div role="row" className={cn(peopleGrid, 'hidden h-[34px] border-b border-line text-xs text-muted-foreground')}>
                <span role="columnheader">Name</span>
                <span role="columnheader">Team</span>
                <span role="columnheader">Role</span>
                <span role="columnheader">Can sign</span>
                <span role="columnheader">Last active</span>
              </div>
              {people.map((p, i) => (
                <div
                  key={p.name + i}
                  role="row"
                  className={cn(peopleGrid, 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-line-soft py-3 text-[13.5px] md:h-[50px] md:py-0')}
                >
                  <span role="cell" className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      initials={p.initials}
                      size="md"
                      tone={p.you ? 'dark' : 'teal'}
                      className={cn(p.lastActive === 'Pending' && 'bg-soft text-muted-foreground')}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{p.name}</span>
                      <span className="truncate text-xs text-muted-foreground md:hidden">
                        {[p.note, p.team, p.lastActive].filter(Boolean).join(' · ')}
                      </span>
                      {p.note ? <span className="hidden truncate text-xs text-muted-foreground md:block">{p.note}</span> : null}
                    </span>
                  </span>
                  <span role="cell" className="hidden text-text-2 md:block">
                    {p.team}
                  </span>
                  <span role="cell" className="col-start-1 md:col-start-auto">
                    <Select
                      aria-label={`Role for ${p.name}`}
                      value={p.role}
                      onValueChange={(role) => setPeople((ps) => ps.map((x, j) => (j === i ? { ...x, role } : x)))}
                      options={roleOptions}
                      className="h-10 w-[170px] rounded-md px-2 text-[13px] md:h-7 md:w-[146px]"
                    />
                  </span>
                  <span role="cell" className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                    <SignCell m={p} />
                  </span>
                  <span role="cell" className="hidden text-[13px] text-muted-foreground md:block">
                    {p.lastActive}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div id="service-accounts" className="flex scroll-mt-4 flex-col">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2 pb-2">
              <h2 className="m-0 text-[15px] font-medium">Service accounts</h2>
              <span className="text-[13px] text-muted-foreground">Machines that read or write data</span>
              <Button variant="outline" size="sm" className="h-10 sm:ml-auto md:h-7">
                New service account
              </Button>
            </div>
            <div role="table" aria-label="Service accounts" className="flex flex-col">
              <div role="row" className={cn(serviceGrid, 'hidden h-[34px] border-b border-line text-xs text-muted-foreground')}>
                <span role="columnheader">Account</span>
                <span role="columnheader">Allowed to</span>
                <span role="columnheader">Key</span>
                <span role="columnheader">
                  <span className="sr-only">Actions</span>
                </span>
              </div>
              {accounts.map((a, i) => (
                <div
                  key={a.name}
                  role="row"
                  className={cn(
                    serviceGrid,
                    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 text-[13.5px] md:h-[50px] md:py-0',
                    i < accounts.length - 1 && 'border-b border-line-soft',
                  )}
                >
                  <span role="cell">
                    <Mono className="text-[13px]">{a.name}</Mono>
                  </span>
                  <span role="cell" className="col-start-1 text-text-2 md:col-start-auto">
                    {a.allowed}
                  </span>
                  <span role="cell" className={cn('col-start-1 text-[13px] md:col-start-auto', a.keyTone === 'warn' ? 'text-warn-ink' : 'text-muted-foreground')}>
                    {a.key}
                  </span>
                  <span role="cell" className="col-start-2 row-span-3 row-start-1 md:col-start-auto md:row-span-1 md:row-start-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-full md:h-7"
                      aria-label={`Rotate key for ${a.name}`}
                      onClick={() => setAccounts((xs) => xs.map((x) => (x.name === a.name ? { ...x, key: 'Rotated just now', keyTone: undefined } : x)))}
                    >
                      Rotate
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside aria-label="Roles" className="flex shrink-0 flex-col border-t border-line bg-raised px-4 py-5 xl:w-[300px] xl:overflow-y-auto xl:border-t-0 xl:border-l xl:px-[22px]">
          <Eyebrow className="pb-1">What each role can do</Eyebrow>
          <RoleNote title="Viewer">See everything, run read-only queries, comment on incidents.</RoleNote>
          <RoleNote title="Engineer">Create branches, run backfills, edit contracts and audits on branches.</RoleNote>
          <RoleNote title="Approver">
            Everything an engineer can, plus sign merges into <Mono className="text-xs">main</Mono> and release tags.
          </RoleNote>
          <RoleNote title="Admin" last>
            Manage people, service accounts and settings. Admin alone doesn’t allow signing.
          </RoleNote>
          <div className="mt-4 rounded-[10px] border border-primary-line bg-primary-soft px-3.5 py-3 text-[12.5px] leading-normal text-primary-ink xl:mt-auto">
            Signing needs an Approver role and a verified identity. Changes to roles are written to the audit log.
          </div>
        </aside>
      </div>
    </SettingsFrame>
  )
}

function SignCell({ m }: { m: Member }) {
  if (m.canSign === 'yes') return <Badge variant="ok">Yes</Badge>
  if (m.canSign === 'setup') return <Badge variant="warn">Not set up</Badge>
  return (
    <span className="text-[13px] text-muted-foreground">
      <span aria-hidden>—</span>
      <span className="sr-only">No</span>
    </span>
  )
}

function RoleNote({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-[3px] py-3', !last && 'border-b border-line-soft')}>
      <span className="text-[13.5px] font-medium">{title}</span>
      <span className="text-[12.5px] leading-snug text-muted-foreground">{children}</span>
    </div>
  )
}

function InviteButton({ onInvite }: { onInvite: (email: string, role: Role) => void }) {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<Role>('Viewer')
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(buttonVariants(), 'h-10 lg:h-8')}>
        <PlusIcon /> Invite people
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(320px,calc(100vw-2rem))] p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!email.trim()) return
            onInvite(email.trim(), role)
            setEmail('')
            setOpen(false)
          }}
        >
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="text-[13.5px] font-medium">
              Role
            </label>
            <Select id="invite-role" value={role} onValueChange={setRole} options={roleOptions.filter((r) => r.value !== 'Admin, Approver')} />
          </div>
          <Button type="submit" className="self-end">
            Send invite
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
