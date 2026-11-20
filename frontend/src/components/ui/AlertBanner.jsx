import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { parseApiError } from '../../lib/apiError'
import { StatusBadge } from './StatusBadge'

const VARIANT_STYLES = {
  error: {
    box: 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]',
    icon: AlertCircle,
    role: 'alert',
  },
  warning: {
    box: 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]',
    icon: AlertTriangle,
    role: 'alert',
  },
  success: {
    box: 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]',
    icon: CheckCircle2,
    role: 'status',
  },
  info: {
    box: 'bg-[#EEF2FF] border-indigo-200 text-[#4338CA]',
    icon: Info,
    role: 'status',
  },
}

/**
 * Displays normalized API errors (conflicting_classes, ungraded_students, field validation) or status messages.
 * @param {object} props
 * @param {any} [props.error]
 * @param {string} [props.message]
 * @param {'error'|'warning'|'success'|'info'} [props.variant]
 * @param {() => void} [props.onDismiss]
 * @param {string} [props.className]
 */
export function AlertBanner({
  error,
  message,
  variant,
  onDismiss,
  className = '',
}) {
  const parsed = error ? parseApiError(error) : null
  const displayMessage = message || parsed?.message

  if (!displayMessage) return null

  const resolvedVariant = variant || (parsed ? 'error' : 'info')
  const style = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.info
  const Icon = style.icon

  const conflictingClasses = parsed?.conflictingClasses || []
  const ungradedStudents = parsed?.ungradedStudents || []
  const fieldEntries = Object.entries(parsed?.fieldErrors || {})

  const conflictTagPreset =
    parsed?.errorCode === 'CLASS_QUOTA_FULL'
      ? 'QUOTA_FULL'
      : parsed?.errorCode && parsed.errorCode.includes('CONFLICT')
        ? 'SCHEDULE_CONFLICT'
        : null

  return (
    <div
      role={style.role}
      className={`rounded-2xl border p-4 text-sm ${style.box} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="font-medium leading-snug">{displayMessage}</p>

          {conflictingClasses.length > 0 && (
            <ul className="space-y-1.5 text-xs">
              {conflictingClasses.map((item, idx) => (
                <li
                  key={item.course_class_id || item.id || idx}
                  className="flex flex-wrap items-center gap-1.5 bg-white/70 rounded-xl px-2.5 py-1.5 border border-current/15"
                >
                  {item.course_code && (
                    <span className="font-mono text-[13px] font-medium">
                      {item.course_code}
                    </span>
                  )}
                  {(item.course_name || item.class_code) && (
                    <span>
                      • {item.course_name} {item.class_code || ''}
                    </span>
                  )}
                  {item.reason && <span>— {item.reason}</span>}
                  {item.quota !== undefined && item.enrolled_count !== undefined && (
                    <span className="font-mono text-[12px]">
                      ({item.enrolled_count}/{item.quota})
                    </span>
                  )}
                  {conflictTagPreset && <StatusBadge preset={conflictTagPreset} />}
                </li>
              ))}
            </ul>
          )}

          {ungradedStudents.length > 0 && (
            <ul className="list-disc pl-4 space-y-1 text-xs">
              {ungradedStudents.map((st, idx) => (
                <li key={st.student_id || idx}>
                  <span className="font-mono text-[13px]">{st.student_number}</span> —{' '}
                  {st.name} (Belum memiliki nilai)
                </li>
              ))}
            </ul>
          )}

          {fieldEntries.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              {fieldEntries.map(([field, messages]) => (
                <li key={field}>
                  <span className="font-medium">{field}</span>: {messages.join(', ')}
                </li>
              ))}
            </ul>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup peringatan"
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default AlertBanner
