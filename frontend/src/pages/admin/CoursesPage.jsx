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
  course_code: '',
  course_name: '',
  credits: 3,
  is_active: true,
}

export function CoursesPage() {
  const { showToast } = useToast()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const res = await api.get('/admin/courses')
      setCourses(unwrapList(res))
    } catch (err) {
      setPageError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        String(c.course_code || '').toLowerCase().includes(q) ||
        String(c.course_name || '').toLowerCase().includes(q)
    )
  }, [courses, search])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      course_code: row.course_code || '',
      course_name: row.course_name || '',
      credits: row.credits ?? 3,
      is_active: row.is_active ?? true,
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
        course_code: form.course_code.trim().toUpperCase(),
        course_name: form.course_name.trim(),
        credits: Number(form.credits),
        is_active: Boolean(form.is_active),
      }
      if (editingId) {
        await api.put(`/admin/courses/${editingId}`, payload)
        showToast('Mata kuliah berhasil diperbarui.')
      } else {
        await api.post('/admin/courses', payload)
        showToast('Mata kuliah baru berhasil ditambahkan.')
      }
      setModalOpen(false)
      await fetchCourses()
    } catch (err) {
      setFormError(err)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'course_code',
      label: 'Kode MK',
      render: (row) => (
        <span className="font-mono text-[13px] font-medium text-[#1E293B]">
          {row.course_code}
        </span>
      ),
    },
    {
      key: 'course_name',
      label: 'Nama Mata Kuliah',
      render: (row) => <span className="font-medium">{row.course_name}</span>,
    },
    {
      key: 'credits',
      label: 'SKS',
      align: 'center',
      render: (row) => <span className="font-mono text-[13px]">{row.credits} SKS</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => <StatusBadge type="active" value={row.is_active ?? true} />,
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
            Katalog Mata Kuliah
          </h2>
          <p className="text-sm text-[#64748B]">
            Kelola kode mata kuliah, nama, dan bobot SKS (1–6).
          </p>
        </div>
        <LoadingButton icon={Plus} onClick={openCreate}>
          Tambah Mata Kuliah
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
              placeholder="Cari kode atau nama mata kuliah..."
              className={getControlClass(false, 'pl-9')}
            />
          </div>
          <span className="text-xs text-[#64748B] whitespace-nowrap">
            {filtered.length} mata kuliah
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyDescription="Belum ada data mata kuliah."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        dismissible={!saving}
        title={editingId ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'}
        size="md"
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
              form="course-form"
              loading={saving}
              loadingText="Menyimpan..."
            >
              Simpan
            </LoadingButton>
          </>
        }
      >
        <form id="course-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertBanner error={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Kode Mata Kuliah"
              htmlFor="crs-code"
              required
              error={fieldErrors.course_code?.[0]}
            >
              <input
                id="crs-code"
                type="text"
                value={form.course_code}
                onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                className={getControlClass(Boolean(fieldErrors.course_code), 'font-mono uppercase')}
                placeholder="IF201"
              />
            </Field>

            <Field
              label="SKS"
              htmlFor="crs-credits"
              required
              error={fieldErrors.credits?.[0]}
            >
              <select
                id="crs-credits"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                className={getControlClass(Boolean(fieldErrors.credits))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} SKS
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Nama Mata Kuliah"
            htmlFor="crs-name"
            required
            error={fieldErrors.course_name?.[0]}
          >
            <input
              id="crs-name"
              type="text"
              value={form.course_name}
              onChange={(e) => setForm({ ...form, course_name: e.target.value })}
              className={getControlClass(Boolean(fieldErrors.course_name))}
              placeholder="Basis Data"
            />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-[#1E293B]">Mata kuliah aktif</span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]"
              />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CoursesPage
