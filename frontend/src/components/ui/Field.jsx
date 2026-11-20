import React from 'react'

export function getControlClass(hasError = false, extra = '') {
  return `w-full h-10 rounded-xl border bg-white px-3 text-sm text-[#1E293B] placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-[#FECDD3] focus:ring-[#F43F5E]/30 focus:border-[#F43F5E]'
      : 'border-slate-200 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]'
  } disabled:bg-slate-50 disabled:text-[#64748B] disabled:cursor-not-allowed ${extra}`
}

/**
 * Form field wrapper with label, required marker, helper, and error display.
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.htmlFor]
 * @param {string} [props.error]
 * @param {string} [props.helper]
 * @param {boolean} [props.required]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Field({
  label,
  htmlFor,
  error,
  helper,
  required = false,
  className = '',
  children,
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-medium text-[#1E293B]"
        >
          {label}
          {required && <span className="text-[#BE123C] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-[#BE123C]" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-[#64748B]">{helper}</p>
      ) : null}
    </div>
  )
}

export default Field
