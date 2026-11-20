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
  lecturer_number: '',
  faculty: 'Fakultas Teknologi Informasi',
  is_active: true,
}

function getLecturerFields(row) {
  return {
    id: row.id,
    username: row.user?.username ?? row.username ?? '',
    name: row.user?.name ?? row.name ?? '',
    is_active: row.user?.is_active ?? row.is_active ?? true,
    lecturer_number: row.lecturer_number ?? '',
    faculty: row.faculty ?? '',
  }
}

export function LecturersPage() {
  const { showToast } = useToast()
  const [lecturers, setLecturers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [wasActive, setWasActive] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const fetchLecturers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setPageError(null)
    try {
      const res = await api.get('/admin/lecturers')
      setLecturers(unwrapList(res))
    } catch (err) {
      setPageError(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLecturers()
  }, [fetchLecturers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lecturers
    return lecturers.filter((row) => {
      const l = getLecturerFields(row)
      return (
        l.lecturer_number.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.username.toLowerCase().includes(q) ||
        l.faculty.toLowerCase().includes(q)
      )
    })
  }, [lecturers, search])

  const openCreate = () => {
    setEditingId(null)
    setWasActive(true)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    const l = getLecturerFields(row)
    setEditingId(l.id)
    setWasActive(Boolean(l.is_active))
    setForm({
      username: l.username,
      name: l.name,
      password: '',
      lecturer_number: l.lecturer_number,
      faculty: l.faculty,
      is_active: Boolean(l.is_active),
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
        lecturer_number: form.lecturer_number.trim(),
        faculty: form.faculty.trim(),
        is_active: Boolean(form.is_active),
      }
      if (form.password) {
        payload.password = form.password
      }

      if (editingId) {
        await api.put(`/admin/lecturers/${editingId}`, payload)
        showToast('Data dosen berhasil diperbarui.')
      } else {
        await api.post('/admin/lecturers', payload)
        showToast('Dosen baru berhasil ditambahkan.')
      }
      setModalOpen(false)
      await fetchLecturers(true)
    } catch (err) {
      setFormError(err)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'lecturer_number',
      label: 'NIDN',
      render: (row) => (
        <span className="font-mono text-[13px] font-medium text-[#1E293B]">
          {getLecturerFields(row).lecturer_number}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nama',
      render: (row) => {
        const l = getLecturerFields(row)
        return (
          <div>
            <p className="font-medium text-[#1E293B]">{l.name}</p>
            <p className="font-mono text-xs text-[#64748B]">@{l.username}</p>
          </div>
        )
      },
    },
    {
      key: 'faculty',
      label: 'Fakultas',
      render: (row) => getLecturerFields(row).faculty || '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <StatusBadge type="active" value={Boolean(getLecturerFields(row).is_active)} />
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
            Daftar Dosen
          </h2>
          <p className="text-sm text-[#64748B]">
            Kelola akun dosen pengampu mata kuliah dan status keaktifan login.
          </p>
        </div>
        <LoadingButton icon={Plus} onClick={openCreate}>
          Tambah Dosen
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
              placeholder="Cari NIDN, nama, atau fakultas..."
              className={getControlClass(false, 'pl-9')}
            />
          </div>
          <span className="text-xs text-[#64748B] whitespace-nowrap">
            {filtered.length} dosen
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyDescription="Belum ada data dosen."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        dismissible={!saving}
        title={editingId ? 'Ubah Dosen' : 'Tambah Dosen'}
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
              form="lecturer-form"
              loading={saving}
              loadingText="Menyimpan..."
            >
              Simpan
            </LoadingButton>
          </>
        }
      >
        <form id="lecturer-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertBanner error={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="NIDN"
              htmlFor="lec-nidn"
              required
              error={fieldErrors.lecturer_number?.[0]}
            >
              <input
                id="lec-nidn"
                type="text"
                value={form.lecturer_number}
                onChange={(e) => setForm({ ...form, lecturer_number: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.lecturer_number), 'font-mono')}
                placeholder="0612088501"
              />
            </Field>

            <Field
              label="Username"
              htmlFor="lec-username"
              required
              error={fieldErrors.username?.[0]}
            >
              <input
                id="lec-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.username))}
                placeholder="dosen1"
              />
            </Field>
          </div>

          <Field label="Nama Lengkap" htmlFor="lec-name" required error={fieldErrors.name?.[0]}>
            <input
              id="lec-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={getControlClass(Boolean(fieldErrors.name))}
              placeholder="Dr. Hendra Wijaya"
            />
          </Field>

          <Field label="Fakultas" htmlFor="lec-faculty" required error={fieldErrors.faculty?.[0]}>
            <input
              id="lec-faculty"
              type="text"
              value={form.faculty}
              onChange={(e) => setForm({ ...form, faculty: e.target.value })}
              className={getControlClass(Boolean(fieldErrors.faculty))}
            />
          </Field>

          <Field
            label={editingId ? 'Kata Sandi Baru (opsional)' : 'Kata Sandi'}
            htmlFor="lec-password"
            required={!editingId}
            error={fieldErrors.password?.[0]}
            helper={
              editingId
                ? 'Kosongkan jika tidak ingin mengubah kata sandi.'
                : 'Minimal 8 karakter.'
            }
          >
            <input
              id="lec-password"
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
                Sesi login dosen akan dicabut segera setelah disimpan.
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default LecturersPage
