import React from 'react'

/**
 * Airy White surface container card.
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.actions]
 * @param {'p-5'|'p-0'} [props.padding='p-5']
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Card({
  title,
  subtitle,
  actions,
  padding = 'p-5',
  className = '',
  children,
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h3 className="font-heading text-base font-semibold text-[#1E293B]">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  )
}

export default Card
