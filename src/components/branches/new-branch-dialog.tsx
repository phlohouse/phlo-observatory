import * as React from 'react'
import { GitBranchIcon, InfoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CheckLine, ChoiceItem, RadioGroup } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { IncidentTile, Mono } from '@/components/phlo/status'
import { cn } from '@/lib/utils'
import type { IncidentKind } from '@/lib/data/types'

type Purpose = 'fix' | 'feat' | 'dev'
const purposes: Array<{ value: Purpose; label: string; prefix: string; help: string }> = [
  { value: 'fix', label: 'Fix', prefix: 'fix/', help: 'Repairs data or a pipeline. Must be merged with a signed approval.' },
  { value: 'feat', label: 'Feature', prefix: 'feat/', help: 'New tables or models. Merged after review and audits.' },
  { value: 'dev', label: 'Sandbox', prefix: 'dev/', help: 'For exploring. Can never be merged into main.' },
]

export function NewBranchDialog({
  open,
  onClose,
  onCreate,
  startPoints,
  incidents,
}: {
  open: boolean
  onClose: () => void
  onCreate: (b: { name: string; from: string; incidentId?: string }) => void
  startPoints: ReadonlyArray<{ value: string; ref: string; commit: string }>
  incidents: Array<{ id: string; title: string; kind: IncidentKind }>
}) {
  const [purpose, setPurpose] = React.useState<Purpose>('fix')
  const [name, setName] = React.useState('elisa-dilution-factor')
  const [from, setFrom] = React.useState(startPoints[0]?.value ?? 'main')
  const [incident, setIncident] = React.useState<string>('213')
  const [audits, setAudits] = React.useState(true)
  const [cleanup, setCleanup] = React.useState(true)
  const p = purposes.find((x) => x.value === purpose)!
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)
  const nameId = React.useId()
  const start = startPoints.find((s) => s.value === from)!

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-[600px]">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onCreate({ name: p.prefix + name, from: `${start.ref}@${start.commit}`, incidentId: incident === 'none' ? undefined : incident })
          }}
        >
          <DialogHeader className="flex-row items-center gap-2.5">
            <GitBranchIcon className="size-[18px] text-branch" aria-hidden />
            <DialogTitle>New branch</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <span id="nb-purpose" className="text-[13.5px] font-medium">
                Purpose
              </span>
              <RadioGroup aria-labelledby="nb-purpose" value={purpose} onValueChange={(v) => setPurpose(v as Purpose)}>
                {purposes.map((x) => (
                  <ChoiceItem key={x.value} value={x.value} className="h-10 sm:h-[34px]">
                    {x.label}
                  </ChoiceItem>
                ))}
              </RadioGroup>
              <span className="text-[12.5px] leading-snug text-muted-foreground">{p.help}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <div
                className={cn(
                  'flex h-10 items-center overflow-hidden rounded-lg border border-input bg-card focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft sm:h-9',
                  !valid && 'border-bad',
                )}
              >
                <span className="flex h-full items-center border-r border-input bg-raised px-2.5 font-mono text-[13px] text-muted-foreground">{p.prefix}</span>
                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!valid || undefined}
                  aria-describedby={`${nameId}-help`}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono text-[13.5px] text-foreground outline-none"
                />
              </div>
              <span id={`${nameId}-help`} className={cn('text-[12.5px]', valid ? 'text-muted-foreground' : 'text-bad-text')}>
                Lowercase letters, numbers and hyphens
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-from">Start from</Label>
                <Select
                  id="nb-from"
                  value={from}
                  onValueChange={setFrom}
                  className="h-10 sm:h-9"
                  options={startPoints.map((s) => ({
                    value: s.value,
                    label: (
                      <span className="flex items-baseline gap-1.5">
                        <Mono className="text-[13px]">{s.ref}</Mono>
                        <Mono className="text-xs text-muted-foreground">@ {s.commit}</Mono>
                      </span>
                    ),
                  }))}
                />
                <span className="text-[12.5px] text-muted-foreground">Or pick a tag or a point in time</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nb-incident">
                  Linked incident <span className="ml-1 font-normal text-muted-foreground">optional</span>
                </Label>
                <Select
                  id="nb-incident"
                  value={incident}
                  onValueChange={setIncident}
                  className="h-10 sm:h-9"
                  options={[
                    { value: 'none', label: <span className="text-muted-foreground">None</span> },
                    ...incidents.map((i) => ({
                      value: i.id,
                      label: (
                        <span className="flex items-center gap-2">
                          <IncidentTile kind={i.kind} />#{i.id} {i.title.split(':')[0]}
                        </span>
                      ),
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-[10px] border border-primary-line bg-primary-soft px-3.5 py-3 text-[13.5px] leading-normal text-primary-ink">
              <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Branches are zero-copy. Nothing is duplicated until you write to a table on the branch, and <Mono>main</Mono> is never changed until you
                merge.
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <CheckLine checked={audits} onCheckedChange={setAudits}>
                Run audits on every commit to this branch
              </CheckLine>
              <CheckLine checked={cleanup} onCheckedChange={setCleanup}>
                Delete the branch 7 days after it’s merged
              </CheckLine>
            </div>
          </DialogBody>
          <DialogFooter className="flex-wrap">
            <span className="w-full min-w-0 truncate text-[13px] text-muted-foreground sm:w-auto">
              Creates <Mono className="text-xs">{p.prefix + name}</Mono>
            </span>
            <Button type="button" variant="outline" size="lg" className="ml-auto h-10 bg-card sm:h-9" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-10 sm:h-9" disabled={!valid}>
              Create branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
