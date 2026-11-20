import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import api, { unwrapData } from '../../lib/api';
import { formatDayName, formatTimeHm, formatWibTime } from '../../lib/datetime';
import {
  AlertBanner,
  Card,
  EmptyState,
  LoadingButton,
  Skeleton,
  StatusBadge,
} from '../../components/ui';

const ATTENDANCE_LABELS = {
  present: 'Hadir',
  excused: 'Izin',
  sick: 'Sakit',
  absent: 'Alpa',
};

function formatTimeRange(start, end) {
  return `${formatTimeHm(start)}–${formatTimeHm(end)}`;
}

function formatDateId(dateStr) {
  if (!dateStr) return '—';
  const parsed = new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function normalizeScheduleClass(item) {
  const cls = item?.course_class || item || {};
  const course = cls.course || item?.course || {};
  const classId = item?.course_class_id ?? cls.id ?? item?.id;
  return {
    id: classId,
    class_code: cls.class_code ?? item?.class_code ?? '',
    course_code: course.course_code ?? item?.course_code ?? '',
    course_name: course.course_name ?? item?.course_name ?? 'Mata Kuliah',
    day_of_week: cls.day_of_week ?? item?.day_of_week ?? '',
    start_time: cls.start_time ?? item?.start_time ?? '',
    end_time: cls.end_time ?? item?.end_time ?? '',
    room: cls.room ?? item?.room ?? '',
  };
}

function normalizeSession(raw) {
  return {
    id: raw.id,
    course_class_id: raw.course_class_id,
    session_number: raw.session_number,
    session_date: raw.session_date,
    topic: raw.topic,
    attendance_status: raw.attendance_status,
    opened_at: raw.opened_at,
    closed_at: raw.closed_at,
    my_attendance: raw.my_attendance ?? raw.attendance ?? null,
  };
}

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClassId = searchParams.get('class_id') || '';

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(queryClassId);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState(null);

  const [courseClassMeta, setCourseClassMeta] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const [submittingSessionId, setSubmittingSessionId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const inFlightRef = useRef(new Set());
  const sessionsReqRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      setLoadingClasses(true);
      setClassesError(null);
      try {
        const res = await api.get('/student/schedule');
        if (!active) return;
        const payload = unwrapData(res);
        const rawItems = Array.isArray(payload)
          ? payload
          : payload?.items ?? payload?.data ?? [];
        const normalized = rawItems
          .map(normalizeScheduleClass)
          .filter((c) => c.id !== undefined && c.id !== null);

        setClasses(normalized);

        if (normalized.length > 0) {
          const exists = normalized.some(
            (c) => String(c.id) === String(queryClassId)
          );
          const initialId = exists ? String(queryClassId) : String(normalized[0].id);
          setSelectedClassId(initialId);
          if (!exists && queryClassId) {
            setSearchParams({ class_id: initialId }, { replace: true });
          }
        } else {
          setSelectedClassId('');
        }
      } catch (err) {
        if (active) setClassesError(err);
      } finally {
        if (active) setLoadingClasses(false);
      }
    }

    loadSchedule();
    return () => {
      active = false;
    };
  }, []);

  const fetchSessions = useCallback(async (classId, { silent = false } = {}) => {
    if (!classId) return;
    const reqId = ++sessionsReqRef.current;
    if (silent) {
      setRefreshingSessions(true);
    } else {
      setLoadingSessions(true);
    }
    setSessionsError(null);
    try {
      const res = await api.get(`/student/classes/${classId}/sessions`);
      if (reqId !== sessionsReqRef.current) return;
      const payload = unwrapData(res);
      setCourseClassMeta(payload?.course_class ?? null);
      const rawSessions = Array.isArray(payload)
        ? payload
        : payload?.sessions ?? payload?.items ?? [];
      setSessions(rawSessions.map(normalizeSession));
    } catch (err) {
      if (reqId !== sessionsReqRef.current) return;
      setSessionsError(err);
      if (!silent) {
        setSessions([]);
      }
    } finally {
      if (reqId === sessionsReqRef.current) {
        setLoadingSessions(false);
        setRefreshingSessions(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    fetchSessions(selectedClassId);
    return () => {
      sessionsReqRef.current += 1;
    };
  }, [selectedClassId, fetchSessions]);

  const activeClass = useMemo(() => {
    const found = classes.find((c) => String(c.id) === String(selectedClassId));
    if (found) return found;
    if (courseClassMeta) return normalizeScheduleClass(courseClassMeta);
    return null;
  }, [classes, selectedClassId, courseClassMeta]);

  const handleClassChange = (e) => {
    const nextId = e.target.value;
    setSelectedClassId(nextId);
    setActionError(null);
    setSuccessMessage('');
    if (nextId) {
      setSearchParams({ class_id: nextId });
    }
  };

  const handleCheckIn = async (sessionId) => {
    if (inFlightRef.current.has(sessionId)) return;
    inFlightRef.current.add(sessionId);
    setSubmittingSessionId(sessionId);
    setActionError(null);
    setSuccessMessage('');

    try {
      const res = await api.post(`/student/sessions/${sessionId}/attendances`);
      const record = unwrapData(res);
      setSessions((prev) =>
        prev.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                my_attendance: {
                  id: record?.id,
                  status: record?.status ?? 'present',
                  recorded_at: record?.recorded_at,
                  notes: record?.notes ?? null,
                },
              }
            : item
        )
      );
      const timeLabel = record?.recorded_at
        ? formatWibTime(record.recorded_at)
        : '';
      setSuccessMessage(
        timeLabel
          ? `Presensi berhasil dicatat (${timeLabel}).`
          : 'Presensi berhasil dicatat.'
      );
    } catch (err) {
      setActionError(err);
      if (selectedClassId) {
        fetchSessions(selectedClassId, { silent: true });
      }
    } finally {
      inFlightRef.current.delete(sessionId);
      setSubmittingSessionId((curr) => (curr === sessionId ? null : curr));
    }
  };

  const renderAttendanceCell = (session) => {
    const record = session.my_attendance;
    if (record) {
      const label = ATTENDANCE_LABELS[record.status] ?? 'Tercatat';
      const timeText = record.recorded_at ? formatWibTime(record.recorded_at) : null;
      return (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge type="attendance" value={record.status} />
          {timeText && (
            <span className="font-mono text-xs text-[#64748B]">
              {label} • {timeText}
            </span>
          )}
        </div>
      );
    }

    if (session.attendance_status === 'open') {
      const isBusy = submittingSessionId === session.id;
      return (
        <LoadingButton
          variant="primary"
          size="sm"
          icon={CheckCircle2}
          loading={isBusy}
          disabled={isBusy}
          loadingText="Menyimpan..."
          onClick={() => handleCheckIn(session.id)}
        >
          Hadir / Isi Presensi
        </LoadingButton>
      );
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge type="attendance" value={null} />
        <span className="text-xs text-[#64748B]">
          {session.attendance_status === 'not_opened'
            ? 'Presensi belum dibuka'
            : 'Presensi telah ditutup'}
        </span>
      </div>
    );
  };

  const classDisplayName = activeClass
    ? `${activeClass.course_name} ${activeClass.class_code}`.trim()
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1E293B]">
            Presensi Perkuliahan
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Isi presensi pada pertemuan yang sedang dibuka oleh dosen pengampu.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <label
              htmlFor="attendance-class-select"
              className="mb-1.5 block text-xs font-medium text-[#64748B]"
            >
              Pilih Kelas
            </label>
            <select
              id="attendance-class-select"
              value={selectedClassId}
              onChange={handleClassChange}
              disabled={loadingClasses || classes.length === 0}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#1E293B] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 disabled:bg-slate-100 disabled:text-[#64748B]"
            >
              {classes.length === 0 ? (
                <option value="">Belum ada kelas</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>
                    {cls.course_code ? `${cls.course_code} • ` : ''}
                    {cls.course_name} ({cls.class_code})
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedClassId && (
            <LoadingButton
              variant="secondary"
              icon={RefreshCw}
              loading={loadingSessions || refreshingSessions}
              disabled={loadingSessions || refreshingSessions}
              onClick={() => fetchSessions(selectedClassId, { silent: true })}
            >
              Muat Ulang
            </LoadingButton>
          )}
        </div>
      </div>

      {classesError && <AlertBanner error={classesError} />}
      {sessionsError && <AlertBanner error={sessionsError} />}
      {actionError && (
        <AlertBanner error={actionError} onDismiss={() => setActionError(null)} />
      )}
      {successMessage && (
        <AlertBanner
          variant="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage('')}
        />
      )}

      {loadingClasses ? (
        <Skeleton className="h-64 w-full" />
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="Belum ada jadwal kelas"
            description="Konfirmasi KRS terlebih dahulu untuk dapat mengakses presensi perkuliahan."
            action={
              <Link
                to="/student/krs"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#4F46E5] px-4 text-sm font-medium text-white transition hover:bg-[#4338CA]"
              >
                Buka Halaman KRS
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {activeClass && (
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-mono text-[13px] font-medium text-[#1E293B]">
                      {activeClass.course_code}
                    </span>
                    <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-0.5 font-mono text-[13px] font-semibold text-[#4338CA]">
                      Kelas {activeClass.class_code}
                    </span>
                  </div>
                  <h2 className="mt-2 font-heading text-lg font-semibold text-[#1E293B]">
                    {activeClass.course_name}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748B]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#4F46E5]" />
                    {formatDayName(activeClass.day_of_week)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[13px]">
                    <Clock className="h-4 w-4 text-[#4F46E5]" />
                    {formatTimeRange(activeClass.start_time, activeClass.end_time)}
                  </span>
                  {activeClass.room && (
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[13px] text-[#1E293B]">
                      {activeClass.room}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {loadingSessions ? (
            <Skeleton className="h-64 w-full" />
          ) : sessions.length === 0 ? (
            <Card>
              <EmptyState
                icon={CalendarDays}
                title="Belum ada pertemuan"
                description="Dosen pengampu belum membuat sesi pertemuan untuk kelas ini."
              />
            </Card>
          ) : (
            <>
              <Card title="Daftar Pertemuan" padding="p-0" className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">Kelas</th>
                        <th className="px-5 py-3.5 font-semibold">Pertemuan</th>
                        <th className="px-5 py-3.5 font-semibold">Topik</th>
                        <th className="px-5 py-3.5 font-semibold">Tanggal</th>
                        <th className="px-5 py-3.5 font-semibold">Status Sesi</th>
                        <th className="px-5 py-3.5 font-semibold">Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessions.map((session) => (
                        <tr
                          key={session.id}
                          className="transition-colors hover:bg-slate-50/60"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-[#1E293B]">
                            {classDisplayName}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-[#1E293B]">
                            Pertemuan {session.session_number}
                          </td>
                          <td className="px-5 py-4 text-[#1E293B]">
                            {session.topic || '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-[#64748B]">
                            {formatDateId(session.session_date)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <StatusBadge
                              type="session"
                              value={session.attendance_status}
                            />
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            {renderAttendanceCell(session)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="space-y-3 md:hidden">
                {sessions.map((session) => (
                  <Card key={session.id}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-[#64748B]">
                            {classDisplayName}
                          </p>
                          <h3 className="mt-0.5 font-heading text-base font-semibold text-[#1E293B]">
                            Pertemuan {session.session_number}
                          </h3>
                        </div>
                        <StatusBadge
                          type="session"
                          value={session.attendance_status}
                        />
                      </div>

                      <p className="text-sm text-[#1E293B]">
                        {session.topic || '—'}
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-[#64748B]">
                          {formatDateId(session.session_date)}
                        </span>
                        <div>{renderAttendanceCell(session)}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default AttendancePage;
