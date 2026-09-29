import type { QueryResult } from '@/lib/data/api/query'

const th = 'sticky top-0 z-10 h-[34px] border-r border-b border-r-line-soft border-b-line bg-raised px-3 text-left align-middle font-sans text-xs font-normal whitespace-nowrap text-muted-foreground'
const td = 'h-8 border-r border-b border-line-soft px-3 whitespace-nowrap text-text-2'

/** Data grid for API query results. Scrolls both ways inside its own box. */
export function ResultsGrid({ result }: { result: QueryResult }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[480px] border-separate border-spacing-0 font-mono text-[12.5px]" aria-label="Query results">
        <thead>
          <tr>
            <th scope="col" className={`${th} w-12 text-right`}>
              #
            </th>
            {result.columns.map((column) => (
              <th key={column.name} scope="col" className={th}>
                {column.name}{' '}
                <span className="font-mono text-[10.5px] text-faint">{column.type ?? 'unknown'}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, index) => (
            <tr key={index} className="hover:bg-raised">
              <td className={`${td} text-right text-faint`}>{index + 1}</td>
              {result.columns.map((column) => (
                <td key={column.name} className={td}>
                  {formatCell(row[column.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.has_more ? (
        <p className="m-0 border-t border-line px-4 py-2 text-xs text-muted-foreground">
          Results are capped; additional rows were omitted by the API.
        </p>
      ) : null}
    </div>
  )
}

export function PlanView({ result }: { result: QueryResult }) {
  return (
    <pre className="m-0 min-h-0 flex-1 overflow-auto px-4 py-4 font-mono text-[12.5px] leading-6 whitespace-pre text-text-2 lg:px-5">
      {result.rows
        .map((row) => result.columns.map((column) => formatCell(row[column.name])).join('\t'))
        .join('\n')}
    </pre>
  )
}

function formatCell(value: QueryResult['rows'][number][string]): string {
  if (value === null) return 'NULL'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}
