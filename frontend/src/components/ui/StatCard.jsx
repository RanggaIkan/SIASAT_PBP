import React from 'react'

/**
 * Compact KPI/summary metric card.
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.helper]
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {string} [props.className]
 */
export function StatCard({ label, value, helper, icon: Icon, className = '' }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start justify-between gap-4 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#64748B]">{label}</p>
        <p className="font-heading text-2xl font-bold text-[#1E293B] mt-1">{value}</p>
        {helper && <p className="text-xs text-[#64748B] mt-1">{helper}</p>}
      </div>
      {Icon && (
        <div className="h-10 w-10 rounded-xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

export default StatCard
