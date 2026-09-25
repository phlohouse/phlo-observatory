import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CheckLine, OptionCard, RadioGroup } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/toggle-group'
import { Stat } from '@/components/phlo/kpi'
import { Mono } from '@/components/phlo/status'
import type { MaterializeMode } from '@/lib/data/fixtures/assets'

type Mode = MaterializeMode['value']

export function MaterializeDialog({
  open,
  onClose,
  onStart,
  assetId,
  via,
  modes,
  rebuild,
  workBranch,
  window,
}: {
  open: boolean
  onClose: () => void
  onStart: () => void
  assetId: string
  via: string
  modes: MaterializeMode[]
  rebuild?: string
  workBranch?: string
  window: { from: string; to: string }
}) {
  const [mode, setMode] = React.useState<Mode>('backfill')
  const branch = workBranch ?? `dev/${assetId.split('.')[1]}-backfill`
  const [target, setTarget] = React.useState(branch)
  const cur = modes.find((m) => m.value === mode) ?? modes[0]!
  const e = cur.estimate

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(ev) => {
            ev.preventDefault()
            onStart()
          }}
        >
          <DialogHeader>
            <DialogTitle>Materialize</DialogTitle>
            <DialogDescription>
              <Mono className="text-foreground">{assetId}</Mono> · via <Mono>{via}</Mono>
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <span id="mz-mode" className="text-[13.5px] font-medium">
                What to load
              </span>
              <RadioGroup aria-labelledby="mz-mode" value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex-col flex-nowrap">
                {modes.map((m) => (
                  <OptionCard key={m.value} value={m.value} title={m.title} hint={m.hint} />
                ))}
              </RadioGroup>
            </div>

            {mode === 'backfill' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>From</FieldLabel>
                  <Input defaultValue={window.from} className="font-mono text-[13.5px]" />
                </Field>
                <Field>
                  <FieldLabel>To</FieldLabel>
                  <Input defaultValue={window.to} className="font-mono text-[13.5px]" />
                </Field>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <span id="mz-target" className="text-[13.5px] font-medium">
                Write to
              </span>
              <Segmented
                aria-label="Write to"
                className="self-start"
                value={target}
                onValueChange={setTarget}
                options={[branch, 'main'].map((b) => ({ value: b, label: <Mono className="text-[12.5px]">{b}</Mono> }))}
              />
              {target === 'main' ? (
                <p className="m-0 text-[12.5px] leading-snug text-warn-ink">
                  Writing straight to main is blocked by your audit settings. This will create a branch and ask for a signed merge afterwards.
                </p>
              ) : null}
            </div>

            {rebuild ? <CheckLine defaultChecked>{rebuild}</CheckLine> : null}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="Rows" value={`~${e.rows}`} className="[&>span:first-of-type]:text-[15px]" />
              <Stat label="Runs" value={e.runs} className="[&>span:first-of-type]:text-[15px]" />
              <Stat label="Time" value={`~${e.time}`} className="[&>span:first-of-type]:text-[15px]" />
              <Stat label="Compute" value={e.cost} className="[&>span:first-of-type]:text-[15px]" />
            </div>
          </DialogBody>
          <DialogFooter className="flex-wrap">
            <span className="w-full text-[13px] text-muted-foreground sm:w-auto">Runs in Dagster as a tagged backfill</span>
            <Button type="button" variant="outline" size="lg" className="ml-auto h-10 bg-card sm:h-9" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-10 sm:h-9">
              {e.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
