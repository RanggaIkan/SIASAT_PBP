import React from 'react'

/**
 * Linear progress bar; turns rose when value exceeds max or danger is forced.
 * @param {object} props
 * @param {number} props.value
 * @param {number} [props.max=100]
 * @param {boolean} [props.danger=false]
 * @param {'sm'|'md'} [props.size='md']
 * @param {string} [props.className]
 */
export function ProgressBar({
  value = 0,
  max = 100,
  danger = false,
  size = 'md',
  className = '',
}) {
  const safeMax = max > 0 ? max : 1
  const ratio = (Number(value) / safeMax) * 100
  const clamped = Math.max(0, Math.min(100, ratio))
  const isOverflow = danger || Number(value) > safeMax

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${
        size === 'sm' ? 'h-1.5' : 'h-2.5'
      } ${className}`}
      role="progressbar"
      aria-valuenow={Number(value) || 0}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          isOverflow ? 'bg-[#F43F5E]' : 'bg-[#4F46E5]'
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default ProgressBar
