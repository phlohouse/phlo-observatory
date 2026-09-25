import * as React from 'react'
import { CircleCheckIcon, ClockIcon, GitMergeIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChoiceItem, RadioGroup } from '@/components/ui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel, Label } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Mono } from '@/components/phlo/status'
import type { BranchDetail } from '@/lib/data/fixtures/branches'
import type { Member } from '@/lib/data/types'

type Meaning = 'authored' | 'reviewed' | 'approved'

/** Sign-and-merge (21 CFR Part 11 style): reason, change record, signature meaning, password. */
export function MergeDialog({
  open,
  onClose,
  onMerged,
  branch,
  me,
}: {
  open: boolean
  onClose: () => void
  onMerged: () => void
  branch: BranchDetail
  me: Member
}) {
  const [reason, setReason] = React.useState(
    'Historian upgrade renamed the dissolved oxygen column. Contract updated to do_sat_pct and 184,212 rows backfilled from the 07:26 watermark.',
  )
  const [record, setRecord] = React.useState('[CHANGE_RECORD_ID]')
  const [meaning, setMeaning] = React.useState<Meaning>('approved')
  const [password, setPassword] = React.useState('')
  const [tried, setTried] = React.useState(false)

  const passed = branch.checks.filter((c) => c.state === 'pass').length
  const pending = branch.checks.find((c) => c.state === 'pending')
  const allPassed = passed === branch.checks.length
  const missing = !reason.trim() || !record.trim() || !password
  const pwId = React.useId()
  const reasonId = React.useId()

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-[600px]">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            setTried(true)
            if (!missing) onMerged()
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <GitMergeIcon className="size-[18px] text-branch" aria-hidden />
              <DialogTitle>
                Merge into <Mono className="text-[15px]">main</Mono>
              </DialogTitle>
            </div>
            <DialogDescription>
              <Mono className="rounded bg-branch-soft px-1 text-[12.5px] text-branch">{branch.name}</Mono> · {branch.mergeFacts}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {allPassed ? (
              <div className="flex items-center gap-2.5 rounded-[10px] border border-ok-line bg-ok-wash px-3 py-2.5 text-[13.5px] text-ok-ink">
                <CircleCheckIcon className="size-4 shrink-0 text-ok" aria-hidden />
                All {branch.checks.length} checks passed: contract, backfill, no conflicts, 41/41 audits
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-[10px] bg-warn-soft px-3 py-2.5 text-[13.5px] leading-snug text-warn-ink">
                <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {passed} of {branch.checks.length} checks passed.{' '}
                  {pending?.progress
                    ? `Downstream audits are at ${pending.progress.done} / ${pending.progress.total}; you can sign now and the merge will run when they finish.`
                    : null}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={reasonId}>Reason for change</Label>
              <Textarea
                id={reasonId}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={tried && !reason.trim() ? true : undefined}
                className="text-sm leading-normal"
              />
            </div>

            <Field>
              <FieldLabel>Change record</FieldLabel>
              <Input value={record} onChange={(e) => setRecord(e.target.value)} className="font-mono text-[13px]" aria-invalid={tried && !record.trim() ? true : undefined} />
            </Field>

            <fieldset className="m-0 flex flex-col gap-3 rounded-[10px] border border-border bg-raised p-4">
              <legend className="px-1.5 text-[13.5px] font-medium">Electronic signature</legend>
              <div className="flex items-center gap-2.5">
                <Avatar initials={me.initials} className="size-7 text-[11px]" />
                <div className="flex flex-col">
                  <span className="text-sm">{me.name}</span>
                  <span className="text-xs text-muted-foreground">Signing as data platform owner</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span id="sig-meaning" className="text-[13px] font-medium">
                  Meaning of signature
                </span>
                <RadioGroup aria-labelledby="sig-meaning" value={meaning} onValueChange={(v) => setMeaning(v as Meaning)} className="grid grid-cols-3 gap-2">
                  <ChoiceItem value="authored" className="h-10 bg-card">Authored</ChoiceItem>
                  <ChoiceItem value="reviewed" className="h-10 bg-card">Reviewed</ChoiceItem>
                  <ChoiceItem value="approved" className="h-10 bg-card">Approved</ChoiceItem>
                </RadioGroup>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={pwId} className="text-[13px]">
                  Re-enter your password to sign
                </Label>
                <Input
                  id={pwId}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={tried && !password ? true : undefined}
                  aria-describedby={`${pwId}-help`}
                />
                {tried && !password ? <span className="text-[12.5px] text-bad-text">Enter your password to sign.</span> : null}
              </div>
              <p id={`${pwId}-help`} className="m-0 text-[12.5px] leading-normal text-muted-foreground">
                Your name, the date and time, and the meaning of this signature will be written to the audit log and linked to the merge commit.
              </p>
            </fieldset>
          </DialogBody>
          <DialogFooter className="flex-wrap">
            <span className="w-full text-[13px] text-muted-foreground sm:w-auto">Fast-forward · no downtime</span>
            <Button type="button" variant="outline" size="lg" className="ml-auto h-10 bg-card sm:h-9" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-10 sm:h-9">
              Sign and merge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
