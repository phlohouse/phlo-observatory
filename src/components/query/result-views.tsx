import * as React from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Mono } from '@/components/phlo/status'
import type { ResultRow } from '@/lib/data/fixtures/query'

const cols: Array<{ key: keyof ResultRow; label: string; type: string; num?: boolean }> = [
  { key: 'minute', label: 'minute', type: 'timestamptz' },
  { key: 'vessel', label: 'vessel_id', type: 'string' },
  { key: 'ph', label: 'ph', type: 'double', num: true },
  { key: 'doPct', label: 'do_pct', type: 'double', num: true },
  { key: 'temp', label: 'temp_c', type: 'double', num: true },
  { key: 'n', label: 'n', type: 'int', num: true },
]

const th = 'sticky top-0 z-10 h-[34px] border-r border-b border-r-line-soft border-b-line bg-raised px-3 text-left align-middle font-sans text-xs font-normal whitespace-nowrap text-muted-foreground'
const td = 'h-8 border-r border-b border-line-soft px-3 whitespace-nowrap text-text-2'

/** Data grid for query results. Scrolls both ways inside its own box. */
export function ResultsGrid({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 font-mono text-[12.5px]" aria-label="Query results">
        <thead>
          <tr>
            <th scope="col" className={`${th} w-12 text-right`}>
              #
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={`${th} ${c.num ? 'text-right' : ''} ${c.key === 'minute' ? 'w-[170px]' : c.key === 'n' ? 'w-20' : 'w-[110px]'}`}>
                {c.label} <span className="font-mono text-[10.5px] text-faint">{c.type}</span>
              </th>
            ))}
            <th aria-hidden className={`${th} border-r-0`} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-raised">
              <td className={`${td} text-right text-faint`}>{i + 1}</td>
              {cols.map((c) => (
                <td key={c.key} className={`${td} ${c.num ? 'text-right text-foreground' : ''}`}>
                  {r[c.key]}
                </td>
              ))}
              <td className={`${td} border-r-0`} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const doChartConfig = {
  dissolvedO2: { label: 'do_pct', color: 'var(--primary)' },
} satisfies ChartConfig

/** Minutes since 01:26 → "HH:MM". */
const doClock = (m: number) => {
  const t = 86 + m
  const h = Math.floor(t / 60) % 24
  const mm = t % 60
  return `${h < 10 ? '0' : ''}${h}:${mm < 10 ? '0' : ''}${mm}`
}

/** do_pct by minute, as in the design: 61 points over 6 h (every 6 min from 01:26), setpoint 40 %, feed marker at 04:30. */
export function DoChart({ points }: { points: number[] }) {
  const data = React.useMemo(() => points.map((v, k) => ({ minute: k * 6, dissolvedO2: Math.round(v * 10) / 10 })), [points])
  const lastIndex = points.length - 1
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto px-4 py-4 lg:px-6 lg:py-[18px]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-medium">
          <Mono>do_pct</Mono> by minute
        </span>
        <span className="text-[13px] text-muted-foreground">BR-2026-121 · vessel BR-V03 · last 6 h of data</span>
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground sm:ml-auto">
          <span className="w-4 border-t border-dashed border-muted-foreground" />
          Setpoint 40%
        </span>
      </div>
      <ChartContainer
        config={doChartConfig}
        label="Dissolved oxygen fell gradually from about 48 percent to 42 percent over six hours, with a short rise after the feed at 04:30. It stayed above the 40 percent setpoint."
        className="aspect-auto h-[260px] w-full max-w-[876px] sm:h-[380px]"
      >
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="minute"
            type="number"
            domain={[0, 360]}
            ticks={[0, 120, 240, 360]}
            tickFormatter={doClock}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
          />
          <YAxis domain={[35, 50]} ticks={[35, 40, 45, 50]} tickLine={false} axisLine={false} width={28} fontSize={11} />
          <ReferenceLine y={40} style={{ stroke: 'var(--muted-foreground)' }} strokeDasharray="4 4" />
          <ReferenceLine
            x={184}
            style={{ stroke: 'var(--branch)' }}
            strokeDasharray="2 4"
            label={{ value: 'Feed 04:30', position: 'insideTopLeft', fill: 'var(--branch)', fontSize: 11, offset: 6 }}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: '2 2' }}
            content={<ChartTooltipContent indicator="line" labelFormatter={(m) => doClock(Number(m))} valueFormatter={(v) => `${v}%`} />}
          />
          <Line
            dataKey="dissolvedO2"
            type="linear"
            stroke="var(--color-dissolvedO2)"
            strokeWidth={2}
            strokeLinejoin="round"
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; index?: number }) =>
              p.index === lastIndex ? (
                <circle key="last" cx={p.cx} cy={p.cy} r={4} strokeWidth={2} fill="var(--color-dissolvedO2)" stroke="var(--card)" />
              ) : (
                <g key={p.index} />
              )
            }
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}

export function PlanView({ plan }: { plan: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <pre className="m-0 px-4 py-4 font-mono text-[12.5px] leading-6 whitespace-pre text-text-2 lg:px-5">{plan}</pre>
      <p className="m-0 px-4 pb-4 text-[13px] text-muted-foreground lg:px-5">
        Partition pruning on <Mono>vessel_id</Mono> and <Mono>day(ts)</Mono> skipped 99.8% of files.
      </p>
    </div>
  )
}
