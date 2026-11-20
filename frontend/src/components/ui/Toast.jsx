import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_STYLES = {
  success: {
    border: 'border-emerald-200',
    iconClass: 'text-[#10B981]',
    icon: CheckCircle2,
  },
  info: {
    border: 'border-indigo-200',
    iconClass: 'text-[#4F46E5]',
    icon: Info,
  },
  error: {
    border: 'border-[#FECDD3]',
    iconClass: 'text-[#BE123C]',
    icon: AlertCircle,
  },
}

/**
 * Lightweight toast notification provider (auto-hides after 4s).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, variant = 'success') => {
    if (!message) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const contextValue = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.variant] || TOAST_STYLES.success
          const Icon = style.icon
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm text-sm text-[#1E293B] ${style.border}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden="true" />
              <span className="flex-1 min-w-0">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Tutup notifikasi"
                className="text-[#64748B] hover:text-[#1E293B] rounded-lg p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return {
      showToast: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}

export default ToastProvider
