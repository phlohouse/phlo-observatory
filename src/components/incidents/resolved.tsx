import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Eyebrow, KeyValues } from '@/components/phlo/page'
import { Stat } from '@/components/phlo/kpi'
import { Dot, IncidentStatusBadge, Mono, RichText } from '@/components/phlo/status'
import type { Incident } from '@/lib/data/types'
import type { ResolvedDetail } from '@/lib/data/fixtures/incidents'
import {
  ActivityFeed,
  DetailSplit,
  DetailTabPanel,
  DetailTabs,
  LineageGraph,
  Note,
  PaneHeading,
  RunsTable,
  SideBlock,
  SideDivider,
} from './shared'

type Tab = 'postmortem' | 'activity' | 'runs' | 'lineage'

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'postmortem', label: 'Post-mortem' },
  { value: 'activity', label: 'Activity' },
  { value: 'runs', label: 'Runs' },
  { value: 'lineage', label: 'Lineage' },
]

const severityWord = { high: 'High', medium: 'Medium', low: 'Low' } as const

/** A resolved incident: summary on the left; post-mortem, activity, runs and lineage on the right. */
export function ResolvedIncident({ incident, detail }: { incident: Incident; detail: ResolvedDetail }) {
  const [tab, setTab] = React.useState<Tab>('postmortem')
  const [done, setDone] = React.useState(() => detail.followUps.map((f) => f.done))
  const doneCount = done.filter(Boolean).length

  return (
    <DetailSplit
      side={
        <>
          <SideBlock className="flex flex-col gap-2.5 pt-5 lg:pt-[22px]">
            <div className="flex flex-wrap items-center gap-2">
              <Mono className="text-[13px] text-muted-foreground">#{incident.id}</Mono>
              <Badge variant="outline" size="lg" className="ml-1.5">
                {severityWord[incident.severity]}
              </Badge>
              <IncidentStatusBadge status="resolved" />
            </div>
            <h2 className="m-0 text-[22px] leading-tight font-semibold tracking-[-0.01em]">{incident.headline}</h2>
            <p className="m-0 text-sm leading-relaxed text-text-3">{detail.summary}</p>
          </SideBlock>

          <SideBlock>
            <KeyValues
              keyWidth={110}
              className="items-center gap-y-3"
              items={detail.facts.map((f) => {
                const text = f.mono ? <span className="min-w-0 truncate font-mono text-[13px]">{f.value}</span> : f.value
                return [
                  f.key,
                  <>
                    {f.href ? (
                      <Link to={f.href} className="min-w-0 truncate">
                        {text}
                      </Link>
                    ) : (
                      text
                    )}
                    {f.signed ? (
                      <Badge variant="ok" size="sm">
                        signed
                      </Badge>
                    ) : null}
                  </>,
                ]
              })}
            />
          </SideBlock>

          <SideBlock className="grid grid-cols-2 gap-2.5 pb-5">
            {detail.stats.map((s) => (
              <Stat key={s.label} className="[&>span:first-of-type]:text-[15px]" label={s.label} value={s.value} tone={s.tone} />
            ))}
          </SideBlock>

          <SideDivider />
          <SideBlock className="flex flex-col gap-3 pt-4 pb-5">
            <Eyebrow>Timeline</Eyebrow>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {detail.timeline.map((t) => (
                <li key={t.time} className="flex items-center gap-3 text-[13.5px] text-text-2">
                  <span className="w-11 shrink-0 font-mono text-xs text-muted-foreground">{t.time}</span>
                  <Dot tone={t.tone} size="md" />
                  <RichText text={t.text} />
                </li>
              ))}
            </ol>
          </SideBlock>
        </>
      }
    >
      <DetailTabs value={tab} onValueChange={setTab} tabs={TABS}>
        <DetailTabPanel value="postmortem" className="gap-5 lg:px-7 lg:py-[22px]">
          <div className="flex items-center gap-2.5">
            <Avatar initials={detail.postmortem.author.initials} tone={detail.postmortem.author.tone} />
            <span className="text-[13px] text-muted-foreground">
              Written by <span className="text-text-2">{detail.postmortem.author.name}</span> · reviewed by{' '}
              <span className="text-text-2">{detail.postmortem.reviewer}</span> · {detail.postmortem.when}
            </span>
          </div>
          <div className="flex max-w-[68ch] flex-col gap-[18px]">
            {detail.postmortem.sections.map((s) => (
              <section key={s.title}>
                <h3 className="m-0 mb-1 text-[13.5px] font-medium">{s.title}</h3>
                <p className="m-0 text-sm leading-relaxed text-text-2">
                  <RichText text={s.text} />
                </p>
              </section>
            ))}
          </div>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 rounded-[10px] border border-border-card p-4">
            <legend className="sr-only">Follow-ups</legend>
            <div className="flex items-baseline" aria-hidden>
              <span className="text-sm font-medium">Follow-ups</span>
              <span className="ml-auto text-[13px] text-muted-foreground">
                {doneCount} of {done.length} done
              </span>
            </div>
            {detail.followUps.map((f, i) => (
              <label key={i} className="flex min-h-10 cursor-pointer items-start gap-2.5 py-0.5 text-sm leading-snug lg:min-h-0">
                <Checkbox
                  className="mt-0.5"
                  checked={done[i]}
                  onCheckedChange={(c) => setDone((d) => d.map((v, j) => (j === i ? c === true : v)))}
                />
                <span className={cn('min-w-0 flex-1', done[i] && 'text-text-3 line-through')}>
                  <RichText text={f.label} />
                </span>
                <span className="shrink-0 text-[13px] whitespace-nowrap text-muted-foreground">{f.who}</span>
              </label>
            ))}
          </fieldset>
        </DetailTabPanel>

        <DetailTabPanel value="activity" className="lg:pr-6 lg:pl-7">
          <ActivityFeed entries={detail.activity} />
        </DetailTabPanel>

        <DetailTabPanel value="runs">
          <PaneHeading
            title={detail.runs.title}
            note={detail.runs.window}
            link={
              <Link to="/pipelines/$jobName" params={{ jobName: detail.runs.job }}>
                Open in Pipelines
              </Link>
            }
          />
          <RunsTable rows={detail.runs.rows} mode="job" />
        </DetailTabPanel>

        <DetailTabPanel value="lineage" className="lg:px-7">
          <PaneHeading title={detail.lineage.title} note={detail.lineage.note} />
          <LineageGraph graph={detail.lineage.graph} />
          <Note tone="ok">{detail.lineage.outcome}</Note>
        </DetailTabPanel>
      </DetailTabs>
    </DetailSplit>
  )
}
