import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus } from 'lucide-react'
import api, { unwrapData, unwrapList } from '../../lib/api'
import { parseApiError } from '../../lib/apiError'
import {
  DAY_OPTIONS,
  formatDayName,
  formatTimeHm,
  formatWibDate,
  formatWibTime,
} from '../../lib/datetime'
import {
  AlertBanner,
  Card,
  DataTable,
  EmptyState,
  Field,
  LoadingButton,
  Modal,
  ProgressBar,
  StatusBadge,
  Tabs,
  getControlClass,
  useToast,
} from '../../components/ui'

const EMPTY_FORM = {
  semester_id: '',
  course_id: '',
  lecturer_id: '',
  class_code: 'A',
  day_of_week: 'Monday',
  start_time: '08:00',
  end_time: '10:30',
  room: '',
  quota: 30,
}

export function ClassesPage() {
  const { showToast } = useToast()

  const [semesters, setSemesters] = useState([])
  const [courses, setCourses] = useState([])
  const [lecturers, setLecturers] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')

  const [classes, setClasses] = useState([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [pageError, setPageError] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Monitoring slideover state
  const [monitorClass, setMonitorClass] = useState(null)
  const [monitorTab, setMonitorTab] = useState('participants')
  const [participants, setParticipants] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [attendanceRecap, setAttendanceRecap] = useState({ summary: null, participants: [] })
  const [loadingMonitor, setLoadingMonitor] = useState(false)
  const [monitorError, setMonitorError] = useState(null)

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true)
    try {
      const [semRes, crsRes, lecRes] = await Promise.all([
        api.get('/admin/semesters'),
        api.get('/admin/courses'),
        api.get('/admin/lecturers'),
      ])
      const semList = unwrapList(semRes)
      setSemesters(semList)
      setCourses(unwrapList(crsRes))
      setLecturers(unwrapList(lecRes))

      const active = semList.find((s) => s.is_active) || semList[0]
      if (active) {
        setSelectedSemesterId(String(active.id))
      }
    } catch (err) {
      setPageError(err)
    } finally {
      setLoadingMeta(false)
    }
  }, [])

  useEffect(() => {
    fetchMeta()
  }, [fetchMeta])

  const fetchClasses = useCallback(async (semesterId) => {
    setLoadingClasses(true)
    setPageError(null)
    try {
      const params = semesterId ? { semester_id: semesterId } : {}
      const res = await api.get('/admin/classes', { params })
      setClasses(unwrapList(res))
    } catch (err) {
      setPageError(err)
    } finally {
      setLoadingClasses(false)
    }
  }, [])

  useEffect(() => {
    if (!loadingMeta) {
      fetchClasses(selectedSemesterId)
    }
  }, [loadingMeta, selectedSemesterId, fetchClasses])

  const isLocked = Boolean(editingRow && Number(editingRow.enrolled_count) > 0)

  const openCreate = () => {
    setEditingRow(null)
    setForm({
      ...EMPTY_FORM,
      semester_id: selectedSemesterId || String(semesters[0]?.id || ''),
      course_id: String(courses[0]?.id || ''),
      lecturer_id: String(lecturers[0]?.id || ''),
    })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingRow(row)
    setForm({
      semester_id: String(row.semester_id || row.semester?.id || ''),
      course_id: String(row.course_id || row.course?.id || ''),
      lecturer_id: String(row.lecturer_id || row.lecturer?.id || ''),
      class_code: row.class_code || 'A',
      day_of_week: row.day_of_week || 'Monday',
      start_time: formatTimeHm(row.start_time),
      end_time: formatTimeHm(row.end_time),
      room: row.room || '',
      quota: row.quota ?? 30,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const parsedFormError = formError ? parseApiError(formError) : null
  const fieldErrors = parsedFormError?.fieldErrors || {}

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        semester_id: Number(form.semester_id),
        course_id: Number(form.course_id),
        lecturer_id: Number(form.lecturer_id),
        class_code: form.class_code.trim().toUpperCase(),
        day_of_week: form.day_of_week,
        start_time: form.start_time.slice(0, 5),
        end_time: form.end_time.slice(0, 5),
        room: form.room.trim(),
        quota: Number(form.quota),
      }
      if (editingRow) {
        await api.put(`/admin/classes/${editingRow.id}`, payload)
        showToast('Kelas paralel berhasil diperbarui.')
      } else {
        await api.post('/admin/classes', payload)
        showToast('Kelas paralel baru berhasil dibuka.')
      }
      setModalOpen(false)
      await fetchClasses(selectedSemesterId)
    } catch (err) {
      setFormError(err)
    } finally {
      setSaving(false)
    }
  }

  const openMonitor = async (row) => {
    setMonitorClass(row)
    setMonitorTab('participants')
    setSelectedSession(null)
    setAttendanceRecap({ summary: null, participants: [] })
    setMonitorError(null)
    setLoadingMonitor(true)
    try {
      const [partRes, sesRes] = await Promise.all([
        api.get(`/admin/classes/${row.id}/participants`),
        api.get(`/admin/classes/${row.id}/sessions`),
      ])
      const partData = unwrapData(partRes)
      setParticipants(
        Array.isArray(partData) ? partData : partData?.participants || partData?.items || []
      )
      const sesData = unwrapData(sesRes)
      setSessions(Array.isArray(sesData) ? sesData : sesData?.sessions || sesData?.items || [])
    } catch (err) {
      setMonitorError(err)
    } finally {
      setLoadingMonitor(false)
    }
  }

  const openSessionRecap = async (session) => {
    setSelectedSession(session)
    setMonitorTab('recap')
    setMonitorError(null)
    setLoadingMonitor(true)
    try {
      const res = await api.get(`/admin/sessions/${session.id}/attendances`)
      const data = unwrapData(res)
      setAttendanceRecap({
        summary: data?.summary || null,
        participants: Array.isArray(data) ? data : data?.participants || data?.items || [],
      })
    } catch (err) {
      setMonitorError(err)
    } finally {
      setLoadingMonitor(false)
    }
  }

  const filteredClasses = useMemo(() => classes, [classes])

  const columns = [
    {
      key: 'course',
      label: 'Mata Kuliah & Kelas',
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[13px] font-medium text-[#4338CA]">
              {row.course?.course_code || row.course_code}
            </span>
            <span className="font-mono text-[12px] rounded-md bg-slate-100 px-1.5 py-0.5 text-[#1E293B]">
              Kelas {row.class_code}
            </span>
          </div>
          <p className="font-medium text-[#1E293B] mt-0.5">
            {row.course?.course_name || row.course_name}
          </p>
        </div>
      ),
    },
    {
      key: 'lecturer',
      label: 'Dosen',
      render: (row) => row.lecturer?.user?.name || row.lecturer?.name || row.lecturer_name || '—',
    },
    {
      key: 'schedule',
      label: 'Hari / Jam',
      render: (row) => (
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{formatDayName(row.day_of_week)}</p>
          <p className="font-mono text-[13px] text-[#64748B]">
            {formatTimeHm(row.start_time)}–{formatTimeHm(row.end_time)}
          </p>
        </div>
      ),
    },
    {
      key: 'room',
      label: 'Ruang',
      render: (row) => <span className="font-mono text-[13px]">{row.room}</span>,
    },
    {
      key: 'quota',
      label: 'Kuota',
      render: (row) => {
        const enrolled = Number(row.enrolled_count || 0)
        const quota = Number(row.quota || 0)
        const full = quota > 0 && enrolled >= quota
        return (
          <div className="min-w-[130px] space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono font-medium">
                {enrolled}/{quota}
              </span>
              {full && <StatusBadge preset="QUOTA_FULL" />}
            </div>
            <ProgressBar value={enrolled} max={quota || 1} danger={full} size="sm" />
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center gap-1.5">
          <LoadingButton
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => openEdit(row)}
          >
            Ubah
          </LoadingButton>
          <LoadingButton
            variant="soft"
            size="sm"
            icon={Eye}
            onClick={() => openMonitor(row)}
          >
            Monitoring
          </LoadingButton>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[#1E293B]">
            Manajemen Kelas Paralel
          </h2>
          <p className="text-sm text-[#64748B]">
            Buka kelas paralel, cek bentrok jadwal dosen/ruangan, dan pantau peserta & presensi.
          </p>
        </div>
        <LoadingButton icon={Plus} onClick={openCreate} disabled={loadingMeta}>
          Tambah Kelas
        </LoadingButton>
      </div>

      {pageError && <AlertBanner error={pageError} onDismiss={() => setPageError(null)} />}

      <Card padding="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <select
              aria-label="Filter semester"
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className={getControlClass(false)}
            >
              <option value="">Semua Semester</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-[#64748B]">{filteredClasses.length} kelas</span>
        </div>

        <DataTable
          columns={columns}
          rows={filteredClasses}
          loading={loadingMeta || loadingClasses}
          emptyDescription="Belum ada kelas paralel pada semester ini."
        />
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        dismissible={!saving}
        title={editingRow ? 'Ubah Kelas Paralel' : 'Tambah Kelas Paralel'}
        size="lg"
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={saving}
              onClick={() => setModalOpen(false)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              type="submit"
              form="class-form"
              loading={saving}
              loadingText="Menyimpan..."
            >
              Simpan
            </LoadingButton>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertBanner error={formError} />}

          {isLocked && (
            <AlertBanner
              variant="warning"
              message="Kelas sudah memiliki peserta terdaftar (BR-18). Mata kuliah, semester, dosen, dan jadwal dikunci; Anda masih dapat mengubah kode kelas atau kuota."
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Semester"
              htmlFor="cls-sem"
              required
              error={fieldErrors.semester_id?.[0]}
              helper={isLocked ? 'Terkunci karena sudah ada peserta (BR-18)' : undefined}
            >
              <select
                id="cls-sem"
                value={form.semester_id}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, semester_id: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.semester_id))}
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Mata Kuliah"
              htmlFor="cls-course"
              required
              error={fieldErrors.course_id?.[0]}
              helper={isLocked ? 'Terkunci karena sudah ada peserta (BR-18)' : undefined}
            >
              <select
                id="cls-course"
                value={form.course_id}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.course_id))}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} — {c.course_name} ({c.credits} SKS)
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field
                label="Dosen Pengampu"
                htmlFor="cls-lecturer"
                required
                error={fieldErrors.lecturer_id?.[0]}
                helper={isLocked ? 'Terkunci karena sudah ada peserta (BR-18)' : undefined}
              >
                <select
                  id="cls-lecturer"
                  value={form.lecturer_id}
                  disabled={isLocked}
                  onChange={(e) => setForm({ ...form, lecturer_id: e.target.value })}
                  className={getControlClass(Boolean(fieldErrors.lecturer_id))}
                >
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.user?.name || l.name} ({l.lecturer_number})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="Kode Kelas"
              htmlFor="cls-code"
              required
              error={fieldErrors.class_code?.[0]}
            >
              <input
                id="cls-code"
                type="text"
                maxLength={5}
                value={form.class_code}
                onChange={(e) => setForm({ ...form, class_code: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.class_code), 'font-mono uppercase')}
                placeholder="A"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Hari"
              htmlFor="cls-day"
              required
              error={fieldErrors.day_of_week?.[0]}
            >
              <select
                id="cls-day"
                value={form.day_of_week}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.day_of_week))}
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Jam Mulai"
              htmlFor="cls-start"
              required
              error={fieldErrors.start_time?.[0]}
            >
              <input
                id="cls-start"
                type="time"
                value={form.start_time}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.start_time), 'font-mono')}
              />
            </Field>

            <Field
              label="Jam Selesai"
              htmlFor="cls-end"
              required
              error={fieldErrors.end_time?.[0]}
            >
              <input
                id="cls-end"
                type="time"
                value={form.end_time}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.end_time), 'font-mono')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Ruangan"
              htmlFor="cls-room"
              required
              error={fieldErrors.room?.[0]}
            >
              <input
                id="cls-room"
                type="text"
                value={form.room}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.room), 'font-mono')}
                placeholder="FTI-301"
              />
            </Field>

            <Field
              label="Kuota"
              htmlFor="cls-quota"
              required
              error={fieldErrors.quota?.[0]}
              helper={
                editingRow
                  ? `Terdaftar saat ini: ${editingRow.enrolled_count ?? 0} mahasiswa.`
                  : undefined
              }
            >
              <input
                id="cls-quota"
                type="number"
                min={editingRow ? Number(editingRow.enrolled_count || 1) : 1}
                max={500}
                value={form.quota}
                onChange={(e) => setForm({ ...form, quota: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.quota), 'font-mono')}
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Monitoring Slideover */}
      <Modal
        isOpen={Boolean(monitorClass)}
        onClose={() => setMonitorClass(null)}
        variant="slideover"
        size="xl"
        title={
          monitorClass
            ? `Monitoring: ${monitorClass.course?.course_name || ''} (${monitorClass.class_code})`
            : 'Monitoring Kelas'
        }
      >
        {monitorClass && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-[#64748B] flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Kode:{' '}
                <strong className="font-mono text-[#1E293B]">
                  {monitorClass.course?.course_code}
                </strong>
              </span>
              <span>
                Jadwal:{' '}
                <strong className="text-[#1E293B]">
                  {formatDayName(monitorClass.day_of_week)},{' '}
                  <span className="font-mono">
                    {formatTimeHm(monitorClass.start_time)}–{formatTimeHm(monitorClass.end_time)}
                  </span>
                </strong>
              </span>
              <span>
                Ruang: <strong className="font-mono text-[#1E293B]">{monitorClass.room}</strong>
              </span>
            </div>

            {monitorError && <AlertBanner error={monitorError} />}

            <Tabs
              activeKey={monitorTab}
              onChange={setMonitorTab}
              tabs={[
                { key: 'participants', label: 'Peserta', badge: participants.length },
                { key: 'sessions', label: 'Pertemuan', badge: sessions.length },
                {
                  key: 'recap',
                  label: selectedSession
                    ? `Rekap P${selectedSession.session_number}`
                    : 'Rekap Presensi',
                },
              ]}
            />

            {monitorTab === 'participants' && (
              <DataTable
                loading={loadingMonitor}
                rows={participants}
                keyField={(r, idx) => r.student_id || r.id || idx}
                emptyDescription="Belum ada peserta terkonfirmasi di kelas ini."
                columns={[
                  {
                    key: 'student_number',
                    label: 'NIM',
                    render: (r) => (
                      <span className="font-mono text-[13px]">
                        {r.student_number || r.student?.student_number}
                      </span>
                    ),
                  },
                  {
                    key: 'name',
                    label: 'Nama',
                    render: (r) => r.name || r.student?.user?.name || '—',
                  },
                  {
                    key: 'status',
                    label: 'Status KRS',
                    render: () => <StatusBadge type="studyPlan" value="confirmed" />,
                  },
                ]}
              />
            )}

            {monitorTab === 'sessions' && (
              <DataTable
                loading={loadingMonitor}
                rows={sessions}
                onRowClick={openSessionRecap}
                emptyDescription="Belum ada sesi pertemuan."
                columns={[
                  {
                    key: 'session_number',
                    label: 'Pertemuan',
                    render: (r) => (
                      <span className="font-medium">Pertemuan {r.session_number}</span>
                    ),
                  },
                  {
                    key: 'session_date',
                    label: 'Tanggal',
                    render: (r) => formatWibDate(r.session_date),
                  },
                  { key: 'topic', label: 'Topik' },
                  {
                    key: 'attendance_status',
                    label: 'Status',
                    render: (r) => (
                      <StatusBadge type="session" value={r.attendance_status} />
                    ),
                  },
                ]}
              />
            )}

            {monitorTab === 'recap' && (
              <>
                {!selectedSession ? (
                  <EmptyState description="Pilih salah satu pertemuan pada tab Pertemuan untuk melihat rekap presensi." />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                      <span>
                        Pertemuan {selectedSession.session_number}:{' '}
                        <strong className="text-[#1E293B]">{selectedSession.topic}</strong>
                      </span>
                      <StatusBadge
                        type="session"
                        value={selectedSession.attendance_status}
                      />
                    </div>
                    {attendanceRecap.summary && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <StatusBadge
                          tone="emerald"
                          label={`Hadir ${attendanceRecap.summary.present ?? 0}`}
                        />
                        <StatusBadge
                          tone="amber"
                          label={`Izin ${attendanceRecap.summary.excused ?? 0}`}
                        />
                        <StatusBadge
                          tone="amber"
                          label={`Sakit ${attendanceRecap.summary.sick ?? 0}`}
                        />
                        <StatusBadge
                          tone="rose"
                          label={`Alpa ${attendanceRecap.summary.absent ?? 0}`}
                        />
                        <StatusBadge
                          tone="slate"
                          label={`Belum mengisi ${attendanceRecap.summary.unrecorded ?? 0}`}
                        />
                      </div>
                    )}
                    <DataTable
                      loading={loadingMonitor}
                      rows={attendanceRecap.participants}
                      keyField={(r, idx) => r.student_id || idx}
                      emptyDescription="Belum ada peserta."
                      columns={[
                        {
                          key: 'student_number',
                          label: 'NIM',
                          render: (r) => (
                            <span className="font-mono text-[13px]">{r.student_number}</span>
                          ),
                        },
                        { key: 'name', label: 'Nama' },
                        {
                          key: 'status',
                          label: 'Status',
                          render: (r) => (
                            <StatusBadge type="attendance" value={r.status} />
                          ),
                        },
                        {
                          key: 'recorded_at',
                          label: 'Waktu',
                          render: (r) => (
                            <span className="font-mono text-xs text-[#64748B]">
                              {r.recorded_at ? formatWibTime(r.recorded_at) : '—'}
                            </span>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ClassesPage
