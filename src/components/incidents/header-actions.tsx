import * as React from 'react'
import { BellIcon, BellOffIcon, DownloadIcon, EllipsisIcon, LinkIcon, RotateCcwIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import type { Incident } from '@/lib/data/types'
import type { ResolvedDetail } from '@/lib/data/fixtures/incidents'

function copyLink() {
  try {
    void navigator.clipboard.writeText(window.location.href)
  } catch {
    /* clipboard not available */
  }
}

/** Header actions for an open incident: who's on it, subscribe, more. */
export function OpenIncidentActions({ incident }: { incident: Incident }) {
  const [subscribed, setSubscribed] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  return (
    <>
      <div className="hidden sm:flex" aria-label={`People on this incident: ${incident.owner}, QC Analytics`}>
        <Avatar initials="GP" size="lg" />
        <Avatar initials="QC" size="lg" tone="teal" className="-ml-2" />
      </div>
      <Button variant="outline" aria-pressed={subscribed} onClick={() => setSubscribed((s) => !s)} className="h-10 lg:h-8">
        {subscribed ? <BellIcon /> : <BellOffIcon />}
        {subscribed ? 'Subscribed' : 'Subscribe'}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More actions"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-raised text-text-3 hover:bg-soft lg:size-8"
        >
          <EllipsisIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              copyLink()
              setCopied(true)
            }}
          >
            <LinkIcon className="size-3.5" /> {copied ? 'Link copied' : 'Copy link'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSubscribed((s) => !s)}>
            {subscribed ? <BellOffIcon className="size-3.5" /> : <BellIcon className="size-3.5" />}
            {subscribed ? 'Mute notifications' : 'Subscribe'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function postMortemMarkdown(incident: Incident, d: ResolvedDetail) {
  const lines = [
    `# #${incident.id} ${incident.headline}`,
    '',
    d.summary,
    '',
    ...d.facts.map((f) => `- **${f.key}:** ${f.value}`),
    ...d.stats.map((s) => `- **${s.label}:** ${s.value}`),
    '',
    ...d.postmortem.sections.flatMap((s) => [`## ${s.title}`, '', s.text, '']),
    '## Follow-ups',
    '',
    ...d.followUps.map((f) => `- [${f.done ? 'x' : ' '}] ${f.label} (${f.who})`),
    '',
  ]
  return lines.join('\n')
}

/** Header actions for a resolved incident: export the post-mortem, or reopen (with a confirm). */
export function ResolvedIncidentActions({ incident, detail }: { incident: Incident; detail: ResolvedDetail }) {
  const [open, setOpen] = React.useState(false)
  const [reopened, setReopened] = React.useState(false)

  const exportPostMortem = () => {
    const blob = new Blob([postMortemMarkdown(incident, detail)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `incident-${incident.id}-post-mortem.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Button variant="outline" onClick={exportPostMortem} className="h-10 lg:h-8">
        <DownloadIcon /> Export post-mortem
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" className="h-10 lg:h-8" disabled={reopened} />}>
          <RotateCcwIcon /> {reopened ? 'Reopen requested' : 'Reopen'}
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-[300px] flex-col gap-3 p-4">
          <div className="text-sm font-medium">Reopen #{incident.id}?</div>
          <p className="m-0 text-[13px] leading-snug text-muted-foreground">
            It goes back to Investigating and {incident.owner} is notified. The post-mortem stays attached.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setReopened(true)
                setOpen(false)
              }}
            >
              Reopen
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
