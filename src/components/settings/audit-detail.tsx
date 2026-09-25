import { Link } from '@tanstack/react-router'
import { Eyebrow } from '@/components/phlo/page'
import { Mono } from '@/components/phlo/status'
import type { AuditEvent } from '@/lib/data/types'

/**
 * Extra detail for the audit-log side panel. Keyed by event id; events without an entry get a
 * sensible default built from the event itself. (Mock data — moves to fixtures/settings.ts when
 * that file exists.)
 */
const extra: Record<
  string,
  {
    title?: [string, string]
    reason?: string
    manifest?: Array<[string, string, boolean?]>
    links?: Array<{ label: string; to: string; params?: Record<string, string> }>
    hash: string
  }
> = {
  a9e4d10: {
    title: ['fix/telemetry-schema', 'main'],
    reason:
      'Historian upgrade renamed the dissolved oxygen column. Contract updated to do_sat_pct and 184,212 rows backfilled from the 07:26 watermark.',
    manifest: [
      ['Signed by', 'Gareth'],
      ['Meaning', 'Approved'],
      ['Time (UTC)', '2026-09-24 08:48:12', true],
      ['Method', 'Password re-entry'],
      ['Change rec.', '[CHANGE_RECORD_ID]', true],
    ],
    links: [
      { label: 'Incident #214', to: '/incidents/$incidentId', params: { incidentId: '214' } },
      { label: '2 commits · 2 tables', to: '/branches' },
    ],
    hash: 'sha256:4c1f…9be2 · prev 77ad…03c1',
  },
  b21c0e4: {
    links: [{ label: 'Incident #214', to: '/incidents/$incidentId', params: { incidentId: '214' } }],
    hash: 'sha256:77ad…03c1 · prev 1f02…c9a4',
  },
  f5b8e70: {
    reason: 'Batch BR-2026-118 released after QA review of the gold release metrics.',
    manifest: [
      ['Signed by', 'Sam R.'],
      ['Meaning', 'Approved'],
      ['Time (UTC)', '2026-09-21 17:02:40', true],
      ['Method', 'Password re-entry'],
      ['Change rec.', '[CHANGE_RECORD_ID]', true],
    ],
    links: [{ label: 'Tag release/BR-2026-118', to: '/branches' }],
    hash: 'sha256:9e07…41b8 · prev d2c5…7a10',
  },
  '0a9c4d3': {
    manifest: [
      ['Signed by', 'Gareth'],
      ['Meaning', 'Reviewed'],
      ['Time (UTC)', '2026-09-21 16:40:03', true],
      ['Method', 'Password re-entry'],
    ],
    links: [{ label: 'Tag release/BR-2026-118', to: '/branches' }],
    hash: 'sha256:d2c5…7a10 · prev 5b3e…e821',
  },
  '1be27f5': {
    reason: 'Snapshot expiry raised to 7 days so a full week of history is available for batch investigations.',
    links: [{ label: 'Lakehouse settings', to: '/settings' }],
    hash: 'sha256:5b3e…e821 · prev 0c94…2f6d',
  },
  '2c6d8a9': {
    reason: 'Blocked: main is protected from direct writes. The job must write to a branch and merge with a signed approval.',
    links: [{ label: 'Pipeline transform_silver', to: '/pipelines/$jobName', params: { jobName: 'transform_silver' } }],
    hash: 'sha256:0c94…2f6d · prev 8a61…b37e',
  },
}

export function AuditDetail({ event: e }: { event: AuditEvent }) {
  const x = extra[e.id]
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Eyebrow>Event {e.id}</Eyebrow>
        <h2 className="m-0 text-base font-medium">{e.action}</h2>
        <div className="text-[13px] text-muted-foreground">
          {x?.title ? (
            <>
              <Mono className="text-xs">{x.title[0]}</Mono> → <Mono className="text-xs">{x.title[1]}</Mono>
            </>
          ) : (
            <Mono className="text-xs break-all">{e.object}</Mono>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[13.5px] text-muted-foreground">{x?.reason ? 'Reason' : 'Actor'}</div>
        <div className="text-[13.5px] leading-normal">
          {x?.reason ?? `${e.actor} (${e.actorKind.toLowerCase()}) · ${e.day} ${e.time}`}
        </div>
      </div>

      {x?.manifest ? (
        <dl className="m-0 grid grid-cols-[96px_minmax(0,1fr)] gap-y-[9px] rounded-[10px] border border-border bg-card p-3.5">
          <Eyebrow className="col-span-2 pb-0.5">Signature manifest</Eyebrow>
          {x.manifest.map(([k, v, mono]) => (
            <div key={k} className="contents">
              <dt className="text-[13.5px] text-muted-foreground">{k}</dt>
              <dd className={mono ? 'm-0 font-mono text-[12.5px]' : 'm-0 text-[13.5px]'}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : e.signature?.tone === 'bad' ? (
        <div className="rounded-[10px] border border-bad-line bg-bad-wash px-3.5 py-3 text-[13px] text-bad-ink">No signature · the write was refused.</div>
      ) : (
        <div className="rounded-[10px] border border-border bg-card px-3.5 py-3 text-[13px] text-muted-foreground">No signature needed for this action.</div>
      )}

      {x?.links?.length ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-[13.5px] text-muted-foreground">Linked</div>
          {x.links.map((l) => (
            <Link key={l.label} to={l.to} params={l.params} className="text-[13.5px]">
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-1 xl:mt-auto">
        <div className="text-[13.5px] text-muted-foreground">Record hash</div>
        <div className="font-mono text-[11.5px] break-all text-text-3">{x?.hash ?? `sha256:${e.id.slice(0, 4)}…${e.id.slice(-3)}0 · prev chained`}</div>
      </div>
    </>
  )
}
