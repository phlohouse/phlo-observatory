import * as React from 'react'
import { CircleCheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChoiceItem, RadioGroup } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Mono } from '@/components/phlo/status'
import { InlineText } from './bits'
import { cn } from '@/lib/utils'
import type { AssetColumn } from '@/lib/data/fixtures/assets'

const checkTypes = ['Not null', 'Unique', 'Range', 'Accepted values', 'Row count', 'Custom SQL'] as const
type CheckType = (typeof checkTypes)[number]

const failModes = {
  'Block downstream': 'Silver and gold models won’t read a load that fails this check.',
  'Open incident': 'Data still flows, but an incident opens and the owner is notified.',
  'Warn only': 'Shown on the asset page. Nobody is notified.',
} as const
type FailMode = keyof typeof failModes

export function AddAuditDialog({
  open,
  onClose,
  onAdd,
  assetId,
  columns,
  dryRun,
  footer,
}: {
  open: boolean
  onClose: () => void
  onAdd: () => void
  assetId: string
  columns: AssetColumn[]
  dryRun: string
  footer: string
}) {
  // Columns as they are on the work branch (renames applied).
  const cols = columns.filter((c) => !c.name.startsWith('_')).map((c) => ({ name: c.renamedTo ?? c.name, type: c.type }))
  const preferred = cols.find((c) => c.name === 'do_sat_pct') ?? cols.find((c) => c.type === 'double') ?? cols[0]
  const isPct = preferred?.name.endsWith('_pct') ?? false

  const [type, setType] = React.useState<CheckType>('Range')
  const [fail, setFail] = React.useState<FailMode>('Block downstream')
  const [column, setColumn] = React.useState(preferred?.name ?? '')

  const numericCol = ['double', 'int'].includes(cols.find((c) => c.name === column)?.type ?? '')
  const firstNumeric = cols.find((c) => c.type === 'double' || c.type === 'int')

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            onAdd()
          }}
        >
          <DialogHeader>
            <DialogTitle>Add audit</DialogTitle>
            <DialogDescription>
              On <Mono className="text-foreground">{assetId}</Mono> · runs after every load
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <span id="aa-type" className="text-[13.5px] font-medium">
                Check
              </span>
              <RadioGroup aria-labelledby="aa-type" value={type} onValueChange={(v) => setType(v as CheckType)}>
                {checkTypes.map((t) => (
                  <ChoiceItem key={t} value={t}>
                    {t}
                  </ChoiceItem>
                ))}
              </RadioGroup>
            </div>

            {type === 'Custom SQL' ? (
              <Field>
                <FieldLabel>Query that returns failing rows</FieldLabel>
                <Textarea
                  rows={5}
                  className="font-mono text-[13px]"
                  defaultValue={`SELECT *\nFROM ${assetId}\nWHERE ${preferred?.name ?? 'value'} > 0\n  AND ${
                    cols.find((c) => c.name === 'agitation_rpm')?.name ?? firstNumeric?.name ?? 'value'
                  } = 0`}
                />
                <FieldDescription>The audit fails if this returns any rows.</FieldDescription>
              </Field>
            ) : null}

            {type !== 'Custom SQL' && type !== 'Row count' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
                <Field className="col-span-2 sm:col-span-1">
                  <FieldLabel>Column</FieldLabel>
                  <Select
                    aria-label="Column"
                    value={column}
                    onValueChange={setColumn}
                    className="font-mono text-[13px]"
                    options={cols.map((c) => ({
                      value: c.name,
                      label: (
                        <span className="flex items-center gap-2">
                          <Mono className="text-[13px]">{c.name}</Mono>
                          <Mono className="text-[11.5px] text-muted-foreground">{c.type}</Mono>
                        </span>
                      ),
                    }))}
                  />
                </Field>
                {type === 'Range' ? (
                  <>
                    <Field>
                      <FieldLabel>Min</FieldLabel>
                      <UnitInput defaultValue={isPct ? '20' : '0'} unit={isPct ? '%' : undefined} disabled={!numericCol} />
                    </Field>
                    <Field>
                      <FieldLabel>Max</FieldLabel>
                      <UnitInput defaultValue="100" unit={isPct ? '%' : undefined} disabled={!numericCol} />
                    </Field>
                  </>
                ) : null}
              </div>
            ) : null}

            {type === 'Row count' ? (
              <Field>
                <FieldLabel>Allowed deviation</FieldLabel>
                <UnitInput defaultValue="3" unit="σ" className="max-w-[160px]" />
                <FieldDescription>Rows per load, compared with the last 30 loads.</FieldDescription>
              </Field>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <span id="aa-fail" className="text-[13.5px] font-medium">
                When it fails
              </span>
              <RadioGroup aria-labelledby="aa-fail" aria-describedby="aa-fail-help" value={fail} onValueChange={(v) => setFail(v as FailMode)}>
                {(Object.keys(failModes) as FailMode[]).map((f) => (
                  <ChoiceItem key={f} value={f}>
                    {f}
                  </ChoiceItem>
                ))}
              </RadioGroup>
              <span id="aa-fail-help" className="text-[12.5px] leading-snug text-muted-foreground">
                {failModes[fail]}
              </span>
            </div>

            <div className="flex items-start gap-2.5 rounded-[10px] border border-ok-line bg-ok-wash px-3.5 py-3 text-[13.5px] leading-snug text-ok-ink">
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <InlineText text={dryRun} />
            </div>
          </DialogBody>
          <DialogFooter className="flex-wrap">
            <InlineText text={footer} className="w-full text-[13px] text-muted-foreground sm:w-auto" />
            <Button type="button" variant="outline" size="lg" className="ml-auto h-10 bg-card sm:h-9" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-10 sm:h-9">
              Add audit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UnitInput({ unit, className, ...props }: React.ComponentProps<typeof Input> & { unit?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Input {...props} className={unit ? 'pr-8' : undefined} />
      {unit ? (
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted-foreground">
          {unit}
        </span>
      ) : null}
    </div>
  )
}
