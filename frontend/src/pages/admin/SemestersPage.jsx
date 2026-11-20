import React, { useCallback, useEffect, useState } from 'react'
import { CalendarCheck, CalendarX, Pencil, Plus } from 'lucide-react'
import api, { unwrapList } from '../../lib/api'
import { parseApiError } from '../../lib/apiError'
import {
  formatWibDateTime,
  fromWibInputValue,
  getKrsPeriodStatus,
  toWibInputValue,
} from '../../lib/datetime'
import { useAuth } from '../../context/AuthContext'
import {
  AlertBanner,
  Card,
  DataTable,
  Field,
  LoadingButton,
  Modal,
  StatusBadge,
  getControlClass,
  useToast,
} from '../../components/ui'

const EMPTY_FORM = {
  code: '',
  name: '',
  enrollment_start_at: '',
  enrollment_end_at: '',
  is_active: false,
}

export function SemestersPage() {
  const { showToast } = useToast()
  const { refreshSemester } = useAuth()

  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const fetchSemesters = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setPageError(null)
    try {
      const res = await api.get('/admin/semesters')
      setSemesters(unwrapList(res))
    } catch (err) {
      setPageError(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSemesters()
  }, [fetchSemesters])

  const openCreate = () => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    setEditingId(null)
    setForm({
      code: '',
      name: '',
      enrollment_start_at: toWibInputValue(now.toISOString()),
      enrollment_end_at: toWibInputValue(nextWeek.toISOString()),
      is_active: false,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      code: row.code || '',
      name: row.name || '',
      enrollment_start_at: toWibInputValue(row.enrollment_start_at),
      enrollment_end_at: toWibInputValue(row.enrollment_end_at),
      is_active: Boolean(row.is_active),
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
        code: form.code.trim(),
        name: form.name.trim(),
        enrollment_start_at: fromWibInputValue(form.enrollment_start_at),
        enrollment_end_at: fromWibInputValue(form.enrollment_end_at),
        is_active: Boolean(form.is_active),
      }
      if (editingId) {
        await api.put(`/admin/semesters/${editingId}`, payload)
        showToast('Data semester berhasil diperbarui.')
      } else {
        await api.post('/admin/semesters', payload)
        showToast('Semester baru berhasil ditambahkan.')
      }
      setModalOpen(false)
      await Promise.all([fetchSemesters(true), refreshSemester()])
    } catch (err) {
      setFormError(err)
    } finally {
      setSaving(false)
    }
  }

  const handleQuickKrs = async (row, mode) => {
    setPageError(null)
    const now = Date.now()
    let startIso
    let endIso

    if (mode === 'open') {
      startIso = new Date(now - 60 * 60 * 1000).toISOString()
      endIso = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      const origStart = row.enrollment_start_at
        ? new Date(row.enrollment_start_at).getTime()
        : now - 2 * 60 * 60 * 1000
      const endMs = now - 60 * 1000
      const startMs = origStart < endMs ? origStart : endMs - 60 * 60 * 1000
      startIso = new Date(startMs).toISOString()
      endIso = new Date(endMs).toISOString()
    }

    try {
      await api.put(`/admin/semesters/${row.id}`, {
        code: row.code,
        name: row.name,
        enrollment_start_at: startIso,
        enrollment_end_at: endIso,
        is_active: Boolean(row.is_active),
      })
      showToast(
        mode === 'open'
          ? `Periode KRS ${row.name} dibuka.`
          : `Periode KRS ${row.name} ditutup.`
      )
      await Promise.all([fetchSemesters(true), refreshSemester()])
    } catch (err) {
      setPageError(err)
    }
  }

  const columns = [
    {
      key: 'code',
      label: 'Kode',
      render: (row) => (
        <span className="font-mono text-[13px] font-medium">{row.code}</span>
      ),
    },
    {
      key: 'name',
      label: 'Nama Semester',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'period',
      label: 'Periode KRS (WIB)',
      render: (row) => (
        <div className="text-xs text-[#64748B] space-y-0.5">
          <p>Mulai: {formatWibDateTime(row.enrollment_start_at)}</p>
          <p>Selesai: {formatWibDateTime(row.enrollment_end_at)}</p>
        </div>
      ),
    },
    {
      key: 'krs_status',
      label: 'Status KRS',
      render: (row) => <StatusBadge preset={getKrsPeriodStatus(row)} />,
    },
    {
      key: 'is_active',
      label: 'Status Semester',
      render: (row) => <StatusBadge type="active" value={Boolean(row.is_active)} />,
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <LoadingButton
            variant="soft"
            size="sm"
            icon={CalendarCheck}
            onClick={() => handleQuickKrs(row, 'open')}
          >
            Buka KRS
          </LoadingButton>
          <LoadingButton
            variant="danger"
            size="sm"
            icon={CalendarX}
            onClick={() => handleQuickKrs(row, 'close')}
          >
            Tutup KRS
          </LoadingButton>
          <LoadingButton
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => openEdit(row)}
          >
            Ubah
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
            Manajemen Semester & Periode KRS
          </h2>
          <p className="text-sm text-[#64748B]">
            Atur semester aktif dan jadwal buka-tutup pengisian KRS (waktu WIB).
          </p>
        </div>
        <LoadingButton icon={Plus} onClick={openCreate}>
          Tambah Semester
        </LoadingButton>
      </div>

      {pageError && <AlertBanner error={pageError} onDismiss={() => setPageError(null)} />}

      <Card padding="p-0">
        <DataTable
          columns={columns}
          rows={semesters}
          loading={loading}
          emptyDescription="Belum ada data semester."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        dismissible={!saving}
        title={editingId ? 'Ubah Semester' : 'Tambah Semester'}
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
              form="semester-form"
              loading={saving}
              loadingText="Menyimpan..."
            >
              Simpan
            </LoadingButton>
          </>
        }
      >
        <form id="semester-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertBanner error={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Kode" htmlFor="sem-code" required error={fieldErrors.code?.[0]}>
              <input
                id="sem-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.code), 'font-mono')}
                placeholder="20261"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Nama Semester"
                htmlFor="sem-name"
                required
                error={fieldErrors.name?.[0]}
              >
                <input
                  id="sem-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={getControlClass(Boolean(fieldErrors.name))}
                  placeholder="Semester Gasal 2026/2027"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Mulai KRS (WIB)"
              htmlFor="sem-start"
              required
              error={fieldErrors.enrollment_start_at?.[0]}
            >
              <input
                id="sem-start"
                type="datetime-local"
                value={form.enrollment_start_at}
                onChange={(e) => setForm({ ...form, enrollment_start_at: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.enrollment_start_at))}
              />
            </Field>

            <Field
              label="Selesai KRS (WIB)"
              htmlFor="sem-end"
              required
              error={fieldErrors.enrollment_end_at?.[0]}
            >
              <input
                id="sem-end"
                type="datetime-local"
                value={form.enrollment_end_at}
                onChange={(e) => setForm({ ...form, enrollment_end_at: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.enrollment_end_at))}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-[#1E293B]">
                Jadikan semester aktif
              </span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]"
              />
            </label>
            <p className="text-xs text-[#64748B]">
              Semester aktif lain akan dinonaktifkan secara otomatis.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SemestersPage
