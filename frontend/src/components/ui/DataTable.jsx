import React from 'react'
import { EmptyState } from './EmptyState'
import { SkeletonList } from './Skeleton'

/**
 * Responsive scrollable table with loading and empty states.
 * @param {object} props
 * @param {Array<{key: string, label: React.ReactNode, align?: 'left'|'center'|'right', className?: string, headerClassName?: string, render?: (row: any, index: number) => React.ReactNode}>} props.columns
 * @param {Array<any>} props.rows
 * @param {string|((row: any, index: number) => string|number)} [props.keyField='id']
 * @param {(row: any) => void} [props.onRowClick]
 * @param {(row: any) => string} [props.rowClassName]
 * @param {boolean} [props.loading=false]
 * @param {string} [props.emptyTitle]
 * @param {string} [props.emptyDescription='Belum ada data.']
 */
export function DataTable({
  columns = [],
  rows = [],
  keyField = 'id',
  onRowClick,
  rowClassName,
  loading = false,
  emptyTitle,
  emptyDescription = 'Belum ada data.',
}) {
  if (loading) {
    return <SkeletonList rows={5} />
  }

  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const alignClass = (align) => {
    if (align === 'right') return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-[#64748B] text-xs uppercase tracking-wide border-b border-slate-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 font-semibold whitespace-nowrap ${alignClass(col.align)} ${
                  col.headerClassName || ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, idx) => {
            const key =
              typeof keyField === 'function' ? keyField(row, idx) : row?.[keyField] ?? idx
            const extraRowClass = typeof rowClassName === 'function' ? rowClassName(row) : ''

            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors hover:bg-slate-50/60 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${extraRowClass}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-[#1E293B] align-middle ${alignClass(
                      col.align
                    )} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row, idx) : row?.[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
