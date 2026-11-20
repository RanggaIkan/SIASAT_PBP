/**
 * Normalizes Axios or backend API error envelope into a predictable structure.
 * Envelope: { success: false, error_code, message, errors }
 */
export function parseApiError(error) {
  if (!error) return null

  if (!error.response) {
    return {
      status: 0,
      errorCode: 'NETWORK_ERROR',
      message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
      fieldErrors: {},
      conflictingClasses: [],
      ungradedStudents: [],
      raw: error,
    }
  }

  const { status, data } = error.response
  const errorCode = data?.error_code || null
  const message =
    data?.message ||
    (status === 429
      ? 'Terlalu banyak percobaan. Silakan tunggu sebentar.'
      : 'Terjadi kesalahan pada server.')

  const rawErrors = data?.errors ?? null
  const conflictingClasses = Array.isArray(rawErrors?.conflicting_classes)
    ? rawErrors.conflicting_classes
    : []
  const ungradedStudents = Array.isArray(rawErrors?.ungraded_students)
    ? rawErrors.ungraded_students
    : []

  const fieldErrors = {}
  if (rawErrors && typeof rawErrors === 'object' && !Array.isArray(rawErrors)) {
    for (const [key, val] of Object.entries(rawErrors)) {
      if (key === 'conflicting_classes' || key === 'ungraded_students') continue
      if (Array.isArray(val)) {
        fieldErrors[key] = val.map((item) => String(item))
      } else if (typeof val === 'string') {
        fieldErrors[key] = [val]
      }
    }
  }

  return {
    status,
    errorCode,
    message,
    fieldErrors,
    conflictingClasses,
    ungradedStudents,
    raw: data,
  }
}
