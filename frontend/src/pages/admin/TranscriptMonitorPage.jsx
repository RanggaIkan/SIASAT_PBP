import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import api, { unwrapData, unwrapList } from '../../lib/api'
import {
  AlertBanner,
  Card,
  EmptyState,
  Field,
  getControlClass,
} from '../../components/ui'
import TranscriptView from '../../components/academic/TranscriptView'

export function TranscriptMonitorPage() {
  const [students, setStudents] = useState([])
  const [semesters, setSemesters] = useState([])
  const [studentQuery, setStudentQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedSemesterId, setSelectedSemesterId] = useState('')

  const [loadingMeta, setLoadingMeta] = useState(true)
  const [metaError, setMetaError] = useState(null)

  const [transcript, setTranscript] = useState(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [transcriptError, setTranscriptError] = useState(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoadingMeta(true)
      setMetaError(null)
      try {
        const [stRes, semRes] = await Promise.all([
          api.get('/admin/students'),
          api.get('/admin/semesters'),
        ])
        if (!active) return
        const stList = unwrapList(stRes)
        const semList = unwrapList(semRes)
        setStudents(stList)
        setSemesters(semList)
        if (stList[0]) setSelectedStudentId(String(stList[0].id))
        const activeSem = semList.find((s) => s.is_active) || semList[0]
        if (activeSem) setSelectedSemesterId(String(activeSem.id))
      } catch (err) {
        if (active) setMetaError(err)
      } finally {
        if (active) setLoadingMeta(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => {
      const name = (s.user?.name || s.name || '').toLowerCase()
      const nim = (s.student_number || '').toLowerCase()
      return name.includes(q) || nim.includes(q)
    })
  }, [students, studentQuery])

  const fetchTranscript = useCallback(async (studentId, semesterId) => {
    if (!studentId || !semesterId) {
      setTranscript(null)
      return
    }
    setLoadingTranscript(true)
    setTranscriptError(null)
    try {
      const res = await api.get(`/admin/students/${studentId}/transcript`, {
        params: { semester_id: semesterId },
      })
      setTranscript(unwrapData(res))
    } catch (err) {
      setTranscriptError(err)
      setTranscript(null)
    } finally {
      setLoadingTranscript(false)
    }
  }, [])

  useEffect(() => {
    if (!loadingMeta && selectedStudentId && selectedSemesterId) {
      fetchTranscript(selectedStudentId, selectedSemesterId)
    }
  }, [loadingMeta, selectedStudentId, selectedSemesterId, fetchTranscript])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold text-[#1E293B]">
          Monitoring Kartu Hasil Studi (KHS)
        </h2>
        <p className="text-sm text-[#64748B]">
          Lihat KHS dan IPS terpublikasi mahasiswa per semester (hanya-baca).
        </p>
      </div>

      {metaError && <AlertBanner error={metaError} />}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Cari Mahasiswa" htmlFor="tm-search">
            <div className="relative">
              <Search
                className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="tm-search"
                type="search"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Filter NIM atau nama..."
                className={getControlClass(false, 'pl-9')}
              />
            </div>
          </Field>

          <Field label="Mahasiswa" htmlFor="tm-student">
            <select
              id="tm-student"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={loadingMeta}
              className={getControlClass(false)}
            >
              <option value="">-- Pilih Mahasiswa --</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_number} — {s.user?.name || s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Semester" htmlFor="tm-semester">
            <select
              id="tm-semester"
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              disabled={loadingMeta}
              className={getControlClass(false)}
            >
              <option value="">-- Pilih Semester --</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name} {sem.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {!selectedStudentId || !selectedSemesterId ? (
        <Card>
          <EmptyState description="Pilih mahasiswa dan semester untuk menampilkan KHS." />
        </Card>
      ) : (
        <TranscriptView
          data={transcript}
          loading={loadingTranscript}
          error={transcriptError}
        />
      )}
    </div>
  )
}

export default TranscriptMonitorPage
