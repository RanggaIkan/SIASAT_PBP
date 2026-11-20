import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronRight, Clock, MapPin, User } from 'lucide-react'
import api, { unwrapData } from '../../lib/api'
import { DAY_OPTIONS, formatTimeHm } from '../../lib/datetime'
import {
  AlertBanner,
  Card,
  EmptyState,
  LoadingButton,
  SkeletonList,
} from '../../components/ui'

export function SchedulePage() {
  const [semester, setSemester] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedDay, setExpandedDay] = useState('Monday')

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/student/schedule')
      const data = unwrapData(res)
      setSemester(data?.semester || null)
      const list = Array.isArray(data?.items) ? data.items : []
      setItems(list)
      const firstDayWithClass = DAY_OPTIONS.find((d) =>
        list.some(
          (item) =>
            String(item.course_class?.day_of_week || '').toLowerCase() ===
            d.value.toLowerCase()
        )
      )
      if (firstDayWithClass) {
        setExpandedDay(firstDayWithClass.value)
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const groupedByDay = useMemo(() => {
    const groups = {}
    for (const day of DAY_OPTIONS) {
      groups[day.value] = []
    }
    for (const item of items) {
      const cls = item.course_class || item
      const rawDay = String(cls.day_of_week || '').toLowerCase()
      const matched = DAY_OPTIONS.find((d) => d.value.toLowerCase() === rawDay)
      if (matched) {
        groups[matched.value].push({
          id: item.id || cls.id,
          course_class_id: item.course_class_id || cls.id,
          class_code: cls.class_code,
          start_time: cls.start_time,
          end_time: cls.end_time,
          room: cls.room,
          course_code: cls.course?.course_code,
          course_name: cls.course?.course_name,
          credits: cls.course?.credits,
          lecturer_name: cls.lecturer?.user?.name,
        })
      }
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) =>
        formatTimeHm(a.start_time).localeCompare(formatTimeHm(b.start_time))
      )
    }
    return groups
  }, [items])

  if (loading) {
    return (
      <Card padding="p-0">
        <SkeletonList rows={5} />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold text-[#1E293B]">
          Jadwal Kuliah Mingguan
        </h2>
        <p className="text-sm text-[#64748B]">
          {semester ? semester.name : 'Jadwal berdasarkan KRS yang telah dikonfirmasi.'}
        </p>
      </div>

      {error && <AlertBanner error={error} />}

      {!error && items.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Belum ada jadwal kuliah"
            description="Belum ada jadwal. Konfirmasi KRS terlebih dahulu."
            action={
              <Link to="/student/krs">
                <LoadingButton variant="primary">Buka Halaman KRS</LoadingButton>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop & Tablet Weekly Grid */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DAY_OPTIONS.map((day) => {
              const dayItems = groupedByDay[day.value] || []
              return (
                <Card
                  key={day.value}
                  title={day.label}
                  subtitle={`${dayItems.length} kelas`}
                  padding="p-4"
                >
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-[#64748B] py-4 text-center">
                      Tidak ada jadwal kuliah.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dayItems.map((c) => (
                        <Link
                          key={c.id}
                          to={`/student/attendance?class_id=${c.course_class_id}`}
                          className="block rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 hover:border-[#4F46E5] hover:bg-[#EEF2FF]/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs mb-1">
                            <span className="inline-flex items-center gap-1 font-mono font-medium text-[#4338CA]">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatTimeHm(c.start_time)}–{formatTimeHm(c.end_time)}
                            </span>
                            <span className="font-mono text-[#64748B]">
                              {c.course_code} • {c.class_code}
                            </span>
                          </div>
                          <p className="font-heading text-sm font-semibold text-[#1E293B]">
                            {c.course_name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3.5 w-3.5" aria-hidden="true" />
                              {c.lecturer_name || 'Dosen'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-[#1E293B]">
                              <MapPin className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                              {c.room}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Mobile Accordion List */}
          <div className="md:hidden space-y-2.5">
            {DAY_OPTIONS.map((day) => {
              const dayItems = groupedByDay[day.value] || []
              const isOpen = expandedDay === day.value
              return (
                <div
                  key={day.value}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isOpen ? '' : day.value)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-sm text-[#1E293B]">
                        {day.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-[#64748B]">
                        {dayItems.length}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-[#64748B]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#64748B]" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 p-3 space-y-2.5">
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-[#64748B] py-2 text-center">
                          Tidak ada jadwal kuliah.
                        </p>
                      ) : (
                        dayItems.map((c) => (
                          <Link
                            key={c.id}
                            to={`/student/attendance?class_id=${c.course_class_id}`}
                            className="block rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-medium text-[#4338CA]">
                                {formatTimeHm(c.start_time)}–{formatTimeHm(c.end_time)}
                              </span>
                              <span className="font-mono text-[#64748B]">{c.room}</span>
                            </div>
                            <p className="font-heading text-sm font-semibold text-[#1E293B]">
                              {c.course_name} ({c.class_code})
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {c.lecturer_name || 'Dosen'}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default SchedulePage
