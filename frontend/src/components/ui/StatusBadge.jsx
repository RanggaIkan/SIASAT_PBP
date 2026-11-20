import React from 'react'

const TONE_CLASSES = {
  emerald: {
    pill: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    dot: 'bg-[#10B981]',
  },
  amber: {
    pill: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    dot: 'bg-[#F59E0B]',
  },
  rose: {
    pill: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
    dot: 'bg-[#F43F5E]',
  },
  slate: {
    pill: 'bg-slate-50 text-[#64748B] border-slate-200',
    dot: 'bg-slate-400',
  },
}

export const BADGE_PRESETS = {
  QUOTA_FULL: { label: 'Kuota Penuh', tone: 'rose' },
  SCHEDULE_CONFLICT: { label: 'Bentrok Jadwal', tone: 'rose' },
  DUPLICATE_COURSE: { label: 'MK Ganda', tone: 'rose' },
  SELECTED: { label: 'Dipilih', tone: 'emerald' },
  KRS_OPEN: { label: 'KRS Terbuka', tone: 'emerald' },
  KRS_NOT_OPEN: { label: 'KRS Belum Dibuka', tone: 'amber' },
  KRS_CLOSED: { label: 'KRS Ditutup', tone: 'rose' },
  LAST_SEAT: { label: 'Sisa 1 Kursi', tone: 'amber' },
}

const TYPE_MAPPINGS = {
  studyPlan: {
    confirmed: { label: 'Terkonfirmasi', tone: 'emerald' },
    draft: { label: 'Draft', tone: 'amber' },
  },
  session: {
    not_opened: { label: 'Belum dibuka', tone: 'amber' },
    open: { label: 'Terbuka', tone: 'emerald' },
    closed: { label: 'Ditutup', tone: 'rose' },
  },
  attendance: {
    present: { label: 'Hadir', tone: 'emerald' },
    excused: { label: 'Izin', tone: 'amber' },
    sick: { label: 'Sakit', tone: 'amber' },
    absent: { label: 'Alpa', tone: 'rose' },
    unrecorded: { label: 'Belum mengisi', tone: 'amber' },
  },
  published: {
    true: { label: 'Terpublikasi', tone: 'emerald' },
    false: { label: 'Belum Dipublikasikan', tone: 'amber' },
  },
  active: {
    true: { label: 'Aktif', tone: 'emerald' },
    false: { label: 'Nonaktif', tone: 'rose' },
  },
}

function resolveBadge({ type, value, preset, tone, label }) {
  if (preset && BADGE_PRESETS[preset]) {
    return BADGE_PRESETS[preset]
  }
  if (type === 'custom' && typeof value === 'string' && BADGE_PRESETS[value]) {
    return BADGE_PRESETS[value]
  }
  if (label) {
    return { label, tone: tone || 'slate' }
  }
  if (type === 'attendance' && (value === null || value === undefined || value === '')) {
    return TYPE_MAPPINGS.attendance.unrecorded
  }
  if (type && TYPE_MAPPINGS[type]) {
    const key = String(value)
    if (TYPE_MAPPINGS[type][key]) {
      return TYPE_MAPPINGS[type][key]
    }
  }
  return {
    label: value === null || value === undefined ? '—' : String(value),
    tone: tone || 'slate',
  }
}

/**
 * Pastel status pill badge with dot/icon and exact Indonesian labels.
 * @param {object} props
 * @param {'studyPlan'|'session'|'attendance'|'published'|'active'|'custom'} [props.type]
 * @param {string|boolean|null} [props.value]
 * @param {keyof typeof BADGE_PRESETS} [props.preset]
 * @param {'emerald'|'amber'|'rose'|'slate'} [props.tone]
 * @param {string} [props.label]
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {string} [props.className]
 */
export function StatusBadge({
  type,
  value,
  preset,
  tone,
  label,
  icon: Icon,
  className = '',
}) {
  const resolved = resolveBadge({ type, value, preset, tone, label })
  const palette = TONE_CLASSES[resolved.tone] || TONE_CLASSES.slate

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${palette.pill} ${className}`}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${palette.dot}`} aria-hidden="true" />
      )}
      <span>{resolved.label}</span>
    </span>
  )
}

export default StatusBadge
