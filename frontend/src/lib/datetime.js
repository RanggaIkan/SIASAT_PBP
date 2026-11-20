const WIB_TZ = 'Asia/Jakarta'

export const DAY_OPTIONS = [
  { value: 'Monday', label: 'Senin' },
  { value: 'Tuesday', label: 'Selasa' },
  { value: 'Wednesday', label: 'Rabu' },
  { value: 'Thursday', label: 'Kamis' },
  { value: 'Friday', label: 'Jumat' },
  { value: 'Saturday', label: 'Sabtu' },
]

const DAY_MAP = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
}

export function formatDayName(day) {
  if (!day) return '—'
  return DAY_MAP[String(day).trim().toLowerCase()] || String(day)
}

export function formatTimeHm(timeStr) {
  if (!timeStr) return '—'
  const str = String(timeStr)
  return str.length >= 5 ? str.slice(0, 5) : str
}

export function formatWibTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(/\./g, ':')
  return `${formatted} WIB`
}

export function formatWibDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const datePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
  const timePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  return `${datePart}, ${timePart} WIB`
}

export function formatWibDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/**
 * Converts UTC ISO string to `YYYY-MM-DDTHH:mm` in Asia/Jakarta for `<input type="datetime-local">`.
 */
export function toWibInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (type) => parts.find((p) => p.type === type)?.value || '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

/**
 * Converts `<input type="datetime-local">` value (treated as WIB +07:00) to UTC ISO string.
 */
export function fromWibInputValue(localValue) {
  if (!localValue) return null
  const normalized = localValue.length === 16 ? `${localValue}:00+07:00` : `${localValue}+07:00`
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function getKrsPeriodStatus(semester, nowMs = Date.now()) {
  if (!semester || !semester.enrollment_start_at || !semester.enrollment_end_at) {
    return 'KRS_CLOSED'
  }
  const start = new Date(semester.enrollment_start_at).getTime()
  const end = new Date(semester.enrollment_end_at).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 'KRS_CLOSED'
  if (nowMs < start) return 'KRS_NOT_OPEN'
  if (nowMs > end) return 'KRS_CLOSED'
  return 'KRS_OPEN'
}
