import React, { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm border border-transparent',
  secondary: 'bg-white border border-slate-200 text-[#1E293B] hover:bg-slate-50',
  danger: 'bg-white border border-[#FECDD3] text-[#BE123C] hover:bg-[#FFF1F2]',
  soft: 'bg-[#EEF2FF] text-[#4338CA] hover:bg-indigo-100 border border-transparent',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

/**
 * Button with synchronous promise-lock guard to prevent double-submit (NFR-UI-04).
 * @param {object} props
 * @param {boolean} [props.loading]
 * @param {boolean} [props.disabled]
 * @param {'primary'|'secondary'|'danger'|'soft'} [props.variant='primary']
 * @param {'sm'|'md'} [props.size='md']
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {string} [props.loadingText]
 * @param {(e: React.MouseEvent<HTMLButtonElement>) => any} [props.onClick]
 * @param {'button'|'submit'|'reset'} [props.type='button']
 * @param {boolean} [props.fullWidth]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function LoadingButton({
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loadingText,
  onClick,
  type = 'button',
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const lockRef = useRef(false)
  const mountedRef = useRef(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const isLoading = Boolean(loading || busy)
  const isDisabled = Boolean(disabled || isLoading)

  const handleClick = (e) => {
    if (isDisabled || lockRef.current) {
      e.preventDefault()
      return
    }
    if (!onClick) return

    const result = onClick(e)
    if (result && typeof result.then === 'function') {
      lockRef.current = true
      setBusy(true)
      Promise.resolve(result).finally(() => {
        lockRef.current = false
        if (mountedRef.current) {
          setBusy(false)
        }
      })
    }
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 ${
        VARIANTS[variant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.md} ${fullWidth ? 'w-full' : ''} ${
        isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  )
}

export default LoadingButton
