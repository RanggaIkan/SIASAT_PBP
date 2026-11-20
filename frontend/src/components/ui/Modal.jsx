import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

/**
 * Accessible dialog and right-side slideover modal rendered via Portal.
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {'dialog'|'slideover'} [props.variant='dialog']
 * @param {boolean} [props.closeOnBackdrop=true]
 * @param {boolean} [props.dismissible=true]
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant = 'dialog',
  closeOnBackdrop = true,
  dismissible = true,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        panel.focus()
      }
    }, 10)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, dismissible, onClose])

  if (!isOpen) return null

  const isSlideover = variant === 'slideover'

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${
        isSlideover ? 'justify-end items-stretch' : 'items-center justify-center p-4'
      }`}
    >
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity"
        onClick={() => {
          if (closeOnBackdrop && dismissible) onClose?.()
        }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 flex flex-col bg-white border border-slate-200 shadow-xl focus:outline-none ${
          isSlideover
            ? 'w-full sm:max-w-xl h-full rounded-l-2xl rounded-r-none'
            : `w-full ${SIZE_MAP[size] || SIZE_MAP.md} max-h-[90vh] rounded-2xl`
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 id={titleId} className="font-heading text-lg font-semibold text-[#1E293B]">
            {title}
          </h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#64748B] hover:bg-slate-100 hover:text-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={`p-6 overflow-y-auto ${isSlideover ? 'flex-1' : 'max-h-[70vh]'}`}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-100 px-6 py-4 flex flex-wrap justify-end gap-2 bg-white rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Modal
