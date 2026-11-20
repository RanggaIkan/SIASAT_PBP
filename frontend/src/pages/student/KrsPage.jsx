import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, MapPin, RefreshCw, Search, User } from 'lucide-react'
import api, { unwrapData, unwrapList } from '../../lib/api'
import { parseApiError } from '../../lib/apiError'
import {
  formatDayName,
  formatTimeHm,
  getKrsPeriodStatus,
} from '../../lib/datetime'
import { useAuth } from '../../context/AuthContext'
import {
  AlertBanner,
  Card,
  EmptyState,
  LoadingButton,
  Modal,
  ProgressBar,
  SkeletonList,
  StatusBadge,
  getControlClass,
  useToast,
} from '../../components/ui'

function timesOverlap(a, b) {
  if (!a || !b) return false
  if (String(a.day_of_week).toLowerCase() !== String(b.day_of_week).toLowerCase()) {
    return false
  }
  const aStart = formatTimeHm(a.start_time)
  const aEnd = formatTimeHm(a.end_time)
  const bStart = formatTimeHm(b.start_time)
  const bEnd = formatTimeHm(b.end_time)
  return aStart < bEnd && bStart < aEnd
}

export function KrsPage() {
  const { showToast } = useToast()
  const { user, setActiveSemester } = useAuth()

  const [semester, setSemester] = useState(null)
  const [classes, setClasses] = useState([])
  const [studyPlan, setStudyPlan] = useState(null)
  const [maxCredits, setMaxCredits] = useState(
    user?.student?.max_credits ?? 24
  )
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let active = true

    const init = async () => {
      setLoading(true)
      setPageError(null)
      try {
        const [semRes, clsRes, spRes] = await Promise.all([
          api.get('/student/semesters'),
          api.get('/student/classes'),
          api.get('/student/study-plan'),
        ])
        if (!active) return

        const semList = unwrapList(semRes)
        const spData = unwrapData(spRes)
        const activeSem =
          spData?.semester || semList.find((s) => s.is_active) || semList[0] || null
        setSemester(activeSem)
        setClasses(unwrapList(clsRes))

        if (spData?.max_credits) {
          setMaxCredits(Number(spData.max_credits))
        }
        const plan = spData?.study_plan || null
        setStudyPlan(plan)
        const initialIds = Array.isArray(plan?.items)
          ? plan.items.map((item) => item.course_class_id)
          : []
        setSelectedIds(initialIds)

        if (activeSem) {
          setActiveSemester((prev) =>
            prev?.id === activeSem.id &&
            prev?.enrollment_start_at === activeSem.enrollment_start_at &&
            prev?.enrollment_end_at === activeSem.enrollment_end_at
              ? prev
              : activeSem
          )
        }
      } catch (err) {
        if (active) setPageError(err)
      } finally {
        if (active) setLoading(false)
      }
    }

    init()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const krsPeriod = getKrsPeriodStatus(semester)
  const isConfirmed = studyPlan?.status === 'confirmed'
  const isPeriodOpen = krsPeriod === 'KRS_OPEN'
  const canEdit = isPeriodOpen && !isConfirmed

  const classMap = useMemo(() => {
    const map = new Map()
    for (const cls of classes) {
      map.set(cls.id, cls)
    }
    if (Array.isArray(studyPlan?.items)) {
      for (const item of studyPlan.items) {
        if (item.course_class && !map.has(item.course_class_id)) {
          map.set(item.course_class_id, item.course_class)
        }
      }
    }
    return map
  }, [classes, studyPlan])

  const selectedClasses = useMemo(
    () => selectedIds.map((id) => classMap.get(id)).filter(Boolean),
    [selectedIds, classMap]
  )

  const totalSelectedCredits = useMemo(
    () =>
      selectedClasses.reduce(
        (sum, cls) => sum + Number(cls.course?.credits ?? 0),
        0
      ),
    [selectedClasses]
  )

  const confirmedItems = useMemo(() => {
    if (!Array.isArray(studyPlan?.items)) return []
    return studyPlan.items.map((item) => item.course_class).filter(Boolean)
  }, [studyPlan])

  const visibleCatalog = useMemo(() => {
    const source = isConfirmed ? confirmedItems : classes
    const q = search.trim().toLowerCase()
    if (!q) return source
    return source.filter((cls) => {
      const code = (cls.course?.course_code || '').toLowerCase()
      const name = (cls.course?.course_name || '').toLowerCase()
      const classCode = (cls.class_code || '').toLowerCase()
      const lecturer = (cls.lecturer?.user?.name || '').toLowerCase()
      return (
        code.includes(q) ||
        name.includes(q) ||
        classCode.includes(q) ||
        lecturer.includes(q)
      )
    })
  }, [isConfirmed, confirmedItems, classes, search])

  const toggleClass = (cls) => {
    if (!canEdit) return
    setActionError(null)
    setSelectedIds((prev) =>
      prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
    )
  }

  const refreshCatalogOnly = useCallback(async () => {
    try {
      const clsRes = await api.get('/student/classes')
      setClasses(unwrapList(clsRes))
    } catch {
      // ignore secondary refresh error
    }
  }, [])

  const handleSaveDraft = async () => {
    setActionError(null)
    try {
      const res = await api.put('/student/study-plan/draft', {
        course_class_ids: selectedIds,
      })
      const data = unwrapData(res)
      if (data?.study_plan) {
        setStudyPlan(data.study_plan)
      }
      showToast('Draft KRS berhasil disimpan.')
    } catch (err) {
      setActionError(err)
      const parsed = parseApiError(err)
      if (parsed?.errorCode === 'CLASS_QUOTA_FULL') {
        await refreshCatalogOnly()
      }
    }
  }

  const handleConfirmFinal = async () => {
    setConfirming(true)
    setActionError(null)
    try {
      const res = await api.post('/student/study-plan/confirm', {
        course_class_ids: selectedIds,
      })
      const data = unwrapData(res)
      const confirmedPlan = data?.study_plan || null
      if (confirmedPlan) {
        setStudyPlan(confirmedPlan)
        if (Array.isArray(confirmedPlan.items)) {
          setSelectedIds(confirmedPlan.items.map((item) => item.course_class_id))
        }
      }
      setConfirmModalOpen(false)
      showToast('KRS berhasil dikonfirmasi secara final.')

      // Silent background sync of latest catalog & study plan (never flashes skeleton)
      try {
        const [clsRes, spRes] = await Promise.all([
          api.get('/student/classes'),
          api.get('/student/study-plan'),
        ])
        setClasses(unwrapList(clsRes))
        const spData = unwrapData(spRes)
        if (spData?.study_plan) {
          setStudyPlan(spData.study_plan)
          if (Array.isArray(spData.study_plan.items)) {
            setSelectedIds(
              spData.study_plan.items.map((item) => item.course_class_id)
            )
          }
        }
      } catch {
        // ignore silent post-confirm sync error
      }
    } catch (err) {
      setConfirmModalOpen(false)
      setActionError(err)
      const parsed = parseApiError(err)
      if (parsed?.errorCode === 'CLASS_QUOTA_FULL') {
        await refreshCatalogOnly()
      }
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <Card padding="p-0">
        <SkeletonList rows={6} />
      </Card>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[#1E293B]">
            Kartu Rencana Studi
          </h2>
          <p className="text-sm text-[#64748B]">
            {semester ? semester.name : 'Pilih kelas paralel untuk semester aktif.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            type="studyPlan"
            value={studyPlan?.status || 'draft'}
          />
          <StatusBadge preset={krsPeriod} />
        </div>
      </div>

      {pageError && <AlertBanner error={pageError} />}

      {!isPeriodOpen && !isConfirmed && (
        <AlertBanner
          variant="warning"
          message={
            krsPeriod === 'KRS_NOT_OPEN'
              ? 'Periode KRS belum dibuka. Anda belum dapat memilih atau menyimpan kelas.'
              : 'Periode KRS telah ditutup. Pengisian dan perubahan KRS dinonaktifkan.'
          }
        />
      )}

      {isConfirmed && (
        <AlertBanner
          variant="success"
          message="KRS Anda telah dikonfirmasi (final). Daftar kelas di bawah ini bersifat tetap."
        />
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Total SKS Dipilih</p>
            <p className="font-heading text-2xl font-bold text-[#1E293B] mt-0.5">
              <span
                className={
                  totalSelectedCredits > maxCredits ? 'text-[#BE123C]' : 'text-[#4338CA]'
                }
              >
                {totalSelectedCredits}
              </span>{' '}
              <span className="text-base font-medium text-[#64748B]">
                / {maxCredits} SKS
              </span>
            </p>
          </div>
          <span className="text-xs text-[#64748B]">
            {selectedClasses.length} kelas dipilih
          </span>
        </div>
        <ProgressBar
          value={totalSelectedCredits}
          max={maxCredits}
          danger={totalSelectedCredits > maxCredits}
        />
        {totalSelectedCredits > maxCredits && (
          <p className="text-xs text-[#BE123C] mt-2">
            Total SKS melebihi batas maksimal ({maxCredits} SKS).
          </p>
        )}
      </Card>

      {actionError && (
        <AlertBanner error={actionError} onDismiss={() => setActionError(null)} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari mata kuliah, kode, atau dosen..."
              className={getControlClass(false, 'pl-9')}
            />
          </div>
          {!isConfirmed && (
            <LoadingButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loadingText="Memuat..."
              onClick={refreshCatalogOnly}
              className="self-start sm:self-auto shrink-0"
            >
              Refresh Kuota
            </LoadingButton>
          )}
        </div>
        <span className="text-xs text-[#64748B]">
          Menampilkan {visibleCatalog.length} kelas
        </span>
      </div>

      {visibleCatalog.length === 0 ? (
        <Card>
          <EmptyState description="Tidak ada kelas yang sesuai dengan pencarian." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleCatalog.map((cls) => {
            const isSelected = selectedIds.includes(cls.id)
            const enrolled = Number(cls.enrolled_count || 0)
            const quota = Number(cls.quota || 0)
            const isFull = quota > 0 && enrolled >= quota
            const remaining = quota - enrolled

            const conflictingSelected = !isSelected
              ? selectedClasses.filter((sel) => timesOverlap(sel, cls))
              : []
            const hasScheduleConflict = conflictingSelected.length > 0

            const hasDuplicateCourse =
              !isSelected &&
              selectedClasses.some((sel) => sel.course_id === cls.course_id)

            const cannotSelect = !canEdit || (!isSelected && isFull)

            return (
              <div
                key={cls.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between gap-4 transition ${
                  isSelected
                    ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/25'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[13px] font-medium text-[#4338CA]">
                        {cls.course?.course_code}
                      </span>
                      <span className="font-mono text-[12px] rounded-md bg-slate-100 px-1.5 py-0.5 text-[#1E293B]">
                        Kelas {cls.class_code}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-medium text-[#64748B] shrink-0">
                      {cls.course?.credits} SKS
                    </span>
                  </div>

                  <h3 className="font-heading text-base font-semibold text-[#1E293B] leading-snug">
                    {cls.course?.course_name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-[#64748B]">
                    <p className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {cls.lecturer?.user?.name || 'Dosen Pengampu'}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {formatDayName(cls.day_of_week)},{' '}
                        <span className="font-mono text-[#1E293B]">
                          {formatTimeHm(cls.start_time)}–{formatTimeHm(cls.end_time)}
                        </span>
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="font-mono text-[#1E293B]">{cls.room}</span>
                    </p>
                  </div>

                  {!isConfirmed && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {isSelected && <StatusBadge preset="SELECTED" />}
                      {isFull && <StatusBadge preset="QUOTA_FULL" />}
                      {!isFull && remaining === 1 && <StatusBadge preset="LAST_SEAT" />}
                      {hasScheduleConflict && (
                        <span
                          title={`Bentrok dengan: ${conflictingSelected
                            .map(
                              (c) => `${c.course?.course_name} (${c.class_code})`
                            )
                            .join(', ')}`}
                        >
                          <StatusBadge preset="SCHEDULE_CONFLICT" />
                        </span>
                      )}
                      {hasDuplicateCourse && <StatusBadge preset="DUPLICATE_COURSE" />}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">Kuota kelas</span>
                      <span className="font-mono font-medium text-[#1E293B]">
                        {enrolled}/{quota}
                      </span>
                    </div>
                    <ProgressBar value={enrolled} max={quota || 1} danger={isFull} size="sm" />
                  </div>

                  {!isConfirmed && (
                    <LoadingButton
                      fullWidth
                      size="sm"
                      variant={isSelected ? 'secondary' : 'soft'}
                      disabled={cannotSelect}
                      onClick={() => toggleClass(cls)}
                    >
                      {isSelected ? 'Batalkan' : 'Pilih'}
                    </LoadingButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isConfirmed && (
        <div className="fixed bottom-0 inset-x-0 lg:left-64 z-20 bg-white border-t border-slate-200 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-[#64748B]">
              Terpilih:{' '}
              <strong className="text-[#1E293B]">{selectedClasses.length} kelas</strong>{' '}
              (<strong className="font-mono text-[#1E293B]">{totalSelectedCredits}</strong>{' '}
              / {maxCredits} SKS)
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <LoadingButton
                variant="secondary"
                disabled={!canEdit}
                loadingText="Menyimpan..."
                onClick={handleSaveDraft}
              >
                Simpan Draft KRS
              </LoadingButton>
              <LoadingButton
                variant="primary"
                icon={CheckCircle2}
                disabled={!canEdit || selectedIds.length === 0}
                onClick={() => setConfirmModalOpen(true)}
              >
                Konfirmasi KRS Final
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmModalOpen}
        onClose={() => !confirming && setConfirmModalOpen(false)}
        dismissible={!confirming}
        title="Konfirmasi KRS Final?"
        size="md"
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={confirming}
              onClick={() => setConfirmModalOpen(false)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              variant="primary"
              loading={confirming}
              loadingText="Mengonfirmasi..."
              onClick={handleConfirmFinal}
            >
              Ya, Konfirmasi
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-4 text-sm text-[#1E293B]">
          <p>
            KRS yang sudah dikonfirmasi bersifat <strong>final</strong> dan tidak dapat
            diubah.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Ringkasan Kelas Dipilih</span>
              <span className="font-mono text-[#1E293B]">
                Total {totalSelectedCredits} SKS
              </span>
            </div>
            <ul className="divide-y divide-slate-200/70 text-xs">
              {selectedClasses.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-medium text-[#4338CA] mr-1.5">
                      {c.course?.course_code}
                    </span>
                    <span className="font-medium">
                      {c.course?.course_name} ({c.class_code})
                    </span>
                  </div>
                  <span className="font-mono text-[#64748B] shrink-0">
                    {c.course?.credits} SKS
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default KrsPage
