import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import api, { unwrapList } from '../../lib/api'
import { parseApiError } from '../../lib/apiError'
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
  username: '',
  name: '',
  password: '',
  student_number: '',
  study_program: 'Teknik Informatika',
  cohort_year: new Date().getFullYear(),
  max_credits: 24,
  is_active: true,
}

function getStudentFields(row) {
  return {
    id: row.id,
    username: row.user?.username ?? row.username ?? '',
    name: row.user?.name ?? row.name ?? '',
    is_active: row.user?.is_active ?? row.is_active ?? true,
    student_number: row.student_number ?? '',
    study_program: row.study_program ?? '',
    cohort_year: row.cohort_year ?? '',
    max_credits: row.max_credits ?? 24,
  }
}

export function StudentsPage() {
  const { showToast } = useToast()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [wasActive, setWasActive] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const res = await api.get('/admin/students')
      setStudents(unwrapList(res))
    } catch (err) {
      setPageError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((row) => {
      const s = getStudentFields(row)
      return (
        s.student_number.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.study_program.toLowerCase().includes(q)
      )
    })
  }, [students, search])

  const openCreate = () => {
    setEditingId(null)
    setWasActive(true)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    const s = getStudentFields(row)
    setEditingId(s.id)
    setWasActive(Boolean(s.is_active))
    setForm({
      username: s.username,
      name: s.name,
      password: '',
      student_number: s.student_number,
      study_program: s.study_program,
      cohort_year: s.cohort_year || new Date().getFullYear(),
      max_credits: s.max_credits ?? 24,
      is_active: Boolean(s.is_active),
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
        username: form.username.trim(),
        name: form.name.trim(),
        student_number: form.student_number.trim(),
        study_program: form.study_program.trim(),
        cohort_year: Number(form.cohort_year),
        max_credits: Number(form.max_credits),
        is_active: Boolean(form.is_active),
      }
      if (form.password) {
        payload.password = form.password
      }

      if (editingId) {
        await api.put(`/admin/students/${editingId}`, payload)
        showToast('Data mahasiswa berhasil diperbarui.')
      } else {
        await api.post('/admin/students', payload)
        showToast('Mahasiswa baru berhasil ditambahkan.')
      }
      setModalOpen(false)
      await fetchStudents()
    } catch (err) {
      setFormError(err)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'student_number',
      label: 'NIM',
      render: (row) => (
        <span className="font-mono text-[13px] font-medium text-[#1E293B]">
          {getStudentFields(row).student_number}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nama',
      render: (row) => {
        const s = getStudentFields(row)
        return (
          <div>
            <p className="font-medium text-[#1E293B]">{s.name}</p>
            <p className="font-mono text-xs text-[#64748B]">@{s.username}</p>
          </div>
        )
      },
    },
    {
      key: 'study_program',
      label: 'Program Studi / Angkatan',
      render: (row) => {
        const s = getStudentFields(row)
        return (
          <div>
            <p className="text-sm text-[#1E293B]">{s.study_program || '—'}</p>
            {s.cohort_year && (
              <p className="font-mono text-xs text-[#64748B]">Angkatan {s.cohort_year}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'max_credits',
      label: 'Maks. SKS',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-[13px]">{getStudentFields(row).max_credits} SKS</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <StatusBadge type="active" value={Boolean(getStudentFields(row).is_active)} />
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <LoadingButton
          variant="secondary"
          size="sm"
          icon={Pencil}
          onClick={() => openEdit(row)}
        >
          Ubah
        </LoadingButton>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[#1E293B]">
            Daftar Mahasiswa
          </h2>
          <p className="text-sm text-[#64748B]">
            Kelola akun mahasiswa, batas SKS, dan status keaktifan login.
          </p>
        </div>
        <LoadingButton icon={Plus} onClick={openCreate}>
          Tambah Mahasiswa
        </LoadingButton>
      </div>

      {pageError && <AlertBanner error={pageError} onDismiss={() => setPageError(null)} />}

      <Card padding="p-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIM, nama, atau prodi..."
              className={getControlClass(false, 'pl-9')}
            />
          </div>
          <span className="text-xs text-[#64748B] whitespace-nowrap">
            {filtered.length} mahasiswa
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyDescription="Belum ada data mahasiswa."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        dismissible={!saving}
        title={editingId ? 'Ubah Mahasiswa' : 'Tambah Mahasiswa'}
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
              form="student-form"
              loading={saving}
              loadingText="Menyimpan..."
            >
              Simpan
            </LoadingButton>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertBanner error={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="NIM"
              htmlFor="st-nim"
              required
              error={fieldErrors.student_number?.[0]}
            >
              <input
                id="st-nim"
                type="text"
                value={form.student_number}
                onChange={(e) => setForm({ ...form, student_number: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.student_number), 'font-mono')}
                placeholder="672024001"
              />
            </Field>

            <Field
              label="Username"
              htmlFor="st-username"
              required
              error={fieldErrors.username?.[0]}
            >
              <input
                id="st-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.username))}
                placeholder="student1"
              />
            </Field>
          </div>

          <Field label="Nama Lengkap" htmlFor="st-name" required error={fieldErrors.name?.[0]}>
            <input
              id="st-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={getControlClass(Boolean(fieldErrors.name))}
              placeholder="Budi Santoso"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Program Studi"
              htmlFor="st-prodi"
              required
              error={fieldErrors.study_program?.[0]}
            >
              <input
                id="st-prodi"
                type="text"
                value={form.study_program}
                onChange={(e) => setForm({ ...form, study_program: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.study_program))}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Angkatan"
                htmlFor="st-cohort"
                required
                error={fieldErrors.cohort_year?.[0]}
              >
                <input
                  id="st-cohort"
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.cohort_year}
                  onChange={(e) => setForm({ ...form, cohort_year: e.target.value })}
                  className={getControlClass(Boolean(fieldErrors.cohort_year), 'font-mono')}
                />
              </Field>

              <Field
                label="Maks. SKS"
                htmlFor="st-credits"
                required
                error={fieldErrors.max_credits?.[0]}
              >
                <input
                  id="st-credits"
                  type="number"
                  min={1}
                  max={30}
                  value={form.max_credits}
                  onChange={(e) => setForm({ ...form, max_credits: e.target.value })}
                  className={getControlClass(Boolean(fieldErrors.max_credits), 'font-mono')}
                />
              </Field>
            </div>
          </div>

          <Field
            label={editingId ? 'Kata Sandi Baru (opsional)' : 'Kata Sandi'}
            htmlFor="st-password"
            required={!editingId}
            error={fieldErrors.password?.[0]}
            helper={
              editingId
                ? 'Kosongkan jika tidak ingin mengubah kata sandi.'
                : 'Minimal 8 karakter.'
            }
          >
            <input
              id="st-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={getControlClass(Boolean(fieldErrors.password))}
              placeholder={editingId ? '••••••••' : 'Minimal 8 karakter'}
            />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-[#1E293B]">Akun aktif</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]"
              />
            </label>
            {editingId && wasActive && !form.is_active && (
              <p className="text-xs text-[#BE123C]">
                Sesi login mahasiswa akan dicabut segera setelah disimpan.
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default StudentsPage
