import React from 'react'

/**
 * Underline tab switcher adhering to role="tablist".
 * @param {object} props
 * @param {Array<{key: string, label: string, badge?: string|number}>} props.tabs
 * @param {string} props.activeKey
 * @param {(key: string) => void} props.onChange
 * @param {string} [props.className]
 */
export function Tabs({ tabs = [], activeKey, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-6 border-b border-slate-200 overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(tab.key)}
            className={`inline-flex items-center gap-2 py-3 text-sm whitespace-nowrap border-b-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 ${
              isActive
                ? 'border-[#4F46E5] text-[#4338CA] font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4338CA]'
                    : 'bg-slate-100 text-[#64748B]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
