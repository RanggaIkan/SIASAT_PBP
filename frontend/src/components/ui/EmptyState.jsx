import React from 'react'
import { Inbox } from 'lucide-react'

/**
 * Empty state panel with Lucide icon, Indonesian text, and optional action.
 * @param {object} props
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {string} [props.title]
 * @param {string} [props.description='Belum ada data.']
 * @param {React.ReactNode} [props.action]
 * @param {string} [props.className]
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description = 'Belum ada data.',
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="h-12 w-12 rounded-2xl bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      {title && (
        <h3 className="font-heading text-base font-semibold text-[#1E293B] mb-1">
          {title}
        </h3>
      )}
      <p className="text-sm text-[#64748B] max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
