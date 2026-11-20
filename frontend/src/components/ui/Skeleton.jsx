import React from 'react'

/**
 * Loading skeleton placeholder.
 * @param {object} props
 * @param {string} [props.className='h-4 w-full']
 */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} aria-hidden="true" />
}

/**
 * Multi-row table/card skeleton group.
 * @param {object} props
 * @param {number} [props.rows=4]
 */
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export default Skeleton
