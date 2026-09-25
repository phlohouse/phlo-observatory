import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CheckLine, ChoiceItem, RadioGroup } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel, Label } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dot, LayerSwatch } from '@/components/phlo/status'
import type { Layer, Severity } from '@/lib/data/types'

const KINDS = ['Freshness', 'Schema', 'Audit', 'Data quality', 'Catalog', 'Performance'] as const
const SEVERITIES: ReadonlyArray<{ value: Severity; label: string; tone: 'neutral' | 'warn' | 'bad'; help: string }> = [
  { value: 'low', label: 'Low', tone: 'neutral', help: 'Shows in the list, no notifications' },
  { value: 'medium', label: 'Medium', tone: 'warn', help: 'Notifies the owner and #data-platform' },
  { value: 'high', label: 'High', tone: 'bad', help: 'Also pages whoever is on call' },
]

export interface NewIncidentValues {
  title: string
  kind: string
  severity: Severity
  owner: string
  assets: string[]
  description: string
  notifyQa: boolean
  pauseDownstream: boolean
}

/** "New incident" form. Opened from `?dialog=new-incident`; closing hands control back to the route. */
export function NewIncidentDialog({
  open,
  nextId,
  owners,
  assets,
  onClose,
  onCreate,
}: {
  open: boolean
  nextId: string
  owners: ReadonlyArray<{ value: string; initials: string }>
  assets: ReadonlyArray<{ id: string; layer: Layer }>
  onClose: () => void
  onCreate: (v: NewIncidentValues) => void
}) {
  const [title, setTitle] = React.useState('Gaps in CPP trends for vessel BR-V05')
  const [kind, setKind] = React.useState<string>('Data quality')
  const [severity, setSeverity] = React.useState<Severity>('medium')
  const [owner, setOwner] = React.useState('Gareth')
  const [tokens, setTokens] = React.useState<string[]>(['gold.cpp_trends', 'silver.run_summaries'])
  const [assetDraft, setAssetDraft] = React.useState('')
  const [description, setDescription] = React.useState(
    'Hourly CPP trend for BR-V05 has no points between 02:00 and 05:00 on 23 Sep. Raw telemetry for the same window looks complete, so the gap is probably in run_summaries.',
  )
  const [notifyQa, setNotifyQa] = React.useState(true)
  const [pauseDownstream, setPauseDownstream] = React.useState(false)

  const layerOf = (id: string) => assets.find((a) => a.id === id)?.layer ?? (id.split('.')[0] as Layer)
  const addToken = () => {
    const v = assetDraft.trim()
    if (v && !tokens.includes(v)) setTokens((t) => [...t, v])
    setAssetDraft('')
  }
  const sevHelp = SEVERITIES.find((s) => s.value === severity)!.help
  const assetHelp = tokens.includes('gold.cpp_trends')
    ? 'Feeds 1 report: CPP trend report (next run 12:00)'
    : tokens.length
      ? `${tokens.length} ${tokens.length === 1 ? 'table' : 'tables'} affected`
      : 'Add the tables this affects'

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-[640px]">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) return
            onCreate({ title: title.trim(), kind, severity, owner, assets: tokens, description, notifyQa, pauseDownstream })
          }}
        >
          <DialogHeader className="flex-row items-center gap-2.5">
            <DialogTitle>New incident</DialogTitle>
            <span className="font-mono text-[12.5px] text-muted-foreground">#{nextId}</span>
          </DialogHeader>

          <DialogBody>
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span id="ni-kind" className="text-[13.5px] font-medium">
                Kind
              </span>
              <RadioGroup aria-labelledby="ni-kind" value={kind} onValueChange={(v) => setKind(String(v))}>
                {KINDS.map((k) => (
                  <ChoiceItem key={k} value={k}>
                    {k}
                  </ChoiceItem>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span id="ni-sev" className="text-[13.5px] font-medium">
                  Severity
                </span>
                <RadioGroup
                  aria-labelledby="ni-sev"
                  aria-describedby="ni-sev-help"
                  value={severity}
                  onValueChange={(v) => setSeverity(v as Severity)}
                >
                  {SEVERITIES.map((s) => (
                    <ChoiceItem key={s.value} value={s.value}>
                      <Dot tone={s.tone} size="md" />
                      {s.label}
                    </ChoiceItem>
                  ))}
                </RadioGroup>
                <span id="ni-sev-help" className="text-[12.5px] text-muted-foreground">
                  {sevHelp}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ni-owner">Owner</Label>
                <Select
                  id="ni-owner"
                  value={owner}
                  onValueChange={setOwner}
                  options={owners.map((o) => ({
                    value: o.value,
                    label: (
                      <span className="flex items-center gap-2">
                        <Avatar initials={o.initials} />
                        {o.value}
                      </span>
                    ),
                  }))}
                />
                <span className="text-[12.5px] text-muted-foreground">Defaults to the owner of the first asset</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ni-assets">Affected assets</Label>
              <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-1.5 py-1 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft">
                {tokens.map((t) => (
                  <span
                    key={t}
                    className="inline-flex h-[26px] max-w-full items-center gap-1.5 rounded-md border border-border bg-raised pr-0.5 pl-2 font-mono text-[12.5px] text-text-2"
                  >
                    <LayerSwatch layer={layerOf(t)} />
                    <span className="truncate">{t}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${t}`}
                      onClick={() => setTokens((ts) => ts.filter((x) => x !== t))}
                      className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-soft hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="ni-assets"
                  list="ni-asset-options"
                  value={assetDraft}
                  onChange={(e) => setAssetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addToken()
                    } else if (e.key === 'Backspace' && !assetDraft && tokens.length) {
                      setTokens((ts) => ts.slice(0, -1))
                    }
                  }}
                  onBlur={addToken}
                  placeholder="Add a table…"
                  aria-describedby="ni-assets-help"
                  className="h-[26px] min-w-[120px] flex-1 border-0 bg-transparent px-1.5 text-[13.5px] text-foreground outline-none placeholder:text-faint focus-visible:outline-none"
                />
                <datalist id="ni-asset-options">
                  {assets
                    .filter((a) => !tokens.includes(a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id} />
                    ))}
                </datalist>
              </div>
              <span id="ni-assets-help" className="text-[12.5px] text-muted-foreground">
                {assetHelp}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ni-desc">
                What's wrong <span className="ml-1 font-normal text-muted-foreground">Markdown supported</span>
              </Label>
              <Textarea id="ni-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2.5">
              <CheckLine checked={notifyQa} onCheckedChange={(c) => setNotifyQa(c === true)}>
                Notify QA — these tables feed data used in batch release
              </CheckLine>
              <CheckLine checked={pauseDownstream} onCheckedChange={(c) => setPauseDownstream(c === true)}>
                Pause downstream gold models until this is resolved
              </CheckLine>
            </div>
          </DialogBody>

          <DialogFooter>
            <span className="hidden text-[13px] text-muted-foreground sm:inline">Posts to #data-platform</span>
            <Button type="button" variant="outline" size="lg" className="ml-auto bg-card" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={!title.trim()}>
              Create incident
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
