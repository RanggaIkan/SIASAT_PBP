import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  LockOpen,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import api from '../../lib/api';
import {
  formatDayName,
  formatTimeHm,
  formatWibDateTime,
  formatWibTime,
} from '../../lib/datetime';
import { parseApiError } from '../../lib/apiError';
import { scoreToGrade } from '../../lib/grade';
import {
  AlertBanner,
  Card,
  EmptyState,
  LoadingButton,
  Modal,
  Skeleton,
  StatusBadge,
  Tabs,
} from '../../components/ui';

function extractPayload(res) {
  return res?.data?.data ?? res?.data ?? null;
}

function extractList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (key && Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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

function todayDateInput() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function LecturerClassDetailPage() {
  const { classId } = useParams();
  const [activeTab, setActiveTab] = useState('participants');

  const [classInfo, setClassInfo] = useState(null);
  const [loadingClassInfo, setLoadingClassInfo] = useState(true);

  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [participantsError, setParticipantsError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [sessionActionError, setSessionActionError] = useState(null);
  const [sessionSuccess, setSessionSuccess] = useState('');

  // Session modals
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionDateInput, setSessionDateInput] = useState(todayDateInput());
  const [sessionTopicInput, setSessionTopicInput] = useState('');
  const [savingSession, setSavingSession] = useState(false);
  const [sessionModalError, setSessionModalError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);

  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopeningSession, setReopeningSession] = useState(false);
  const [reopenModalError, setReopenModalError] = useState(null);

  const [statusBusyId, setStatusBusyId] = useState(null);

  // Rekap Presensi modal
  const [recapSession, setRecapSession] = useState(null);
  const [recapData, setRecapData] = useState(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [recapError, setRecapError] = useState(null);
  const [updatingStudentId, setUpdatingStudentId] = useState(null);
  const [recapSuccess, setRecapSuccess] = useState('');

  // Grades tab state
  const [gradeRows, setGradeRows] = useState([]);
  const [allPublished, setAllPublished] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [gradesError, setGradesError] = useState(null);
  const [gradeActionError, setGradeActionError] = useState(null);
  const [gradeSuccess, setGradeSuccess] = useState('');
  const [draftScores, setDraftScores] = useState({});
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishingGrades, setPublishingGrades] = useState(false);
  const [ungradedIds, setUngradedIds] = useState(new Set());

  const headerReqRef = useRef(0);
  const participantsReqRef = useRef(0);
  const sessionsReqRef = useRef(0);
  const gradesReqRef = useRef(0);
  const recapReqRef = useRef(0);
  const gradeRowsRef = useRef([]);

  // Revision modal
  const [revisionTarget, setRevisionTarget] = useState(null);
  const [revisionScore, setRevisionScore] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [savingRevision, setSavingRevision] = useState(false);
  const [revisionModalError, setRevisionModalError] = useState(null);

  const mergeClassInfo = useCallback((incoming) => {
    if (!incoming) return;
    setClassInfo((prev) => ({
      ...(prev || {}),
      ...incoming,
      course: incoming.course ?? prev?.course,
      semester: incoming.semester ?? prev?.semester,
    }));
  }, []);

  const fetchClassHeader = useCallback(async () => {
    const reqId = ++headerReqRef.current;
    setLoadingClassInfo(true);
    try {
      const res = await api.get('/lecturer/classes');
      if (reqId !== headerReqRef.current) return;
      const list = extractList(extractPayload(res), 'classes');
      const matched = list.find((c) => String(c.id) === String(classId));
      if (matched) mergeClassInfo(matched);
    } catch {
      // Header fallback handled by tab responses
    } finally {
      if (reqId === headerReqRef.current) {
        setLoadingClassInfo(false);
      }
    }
  }, [classId, mergeClassInfo]);

  const fetchParticipants = useCallback(async () => {
    const reqId = ++participantsReqRef.current;
    setLoadingParticipants(true);
    setParticipantsError(null);
    try {
      const res = await api.get(`/lecturer/classes/${classId}/participants`);
      if (reqId !== participantsReqRef.current) return;
      const payload = extractPayload(res);
      if (payload?.course_class) mergeClassInfo(payload.course_class);
      setParticipants(extractList(payload, 'participants'));
    } catch (err) {
      if (reqId !== participantsReqRef.current) return;
      setParticipantsError(err);
    } finally {
      if (reqId === participantsReqRef.current) {
        setLoadingParticipants(false);
      }
    }
  }, [classId, mergeClassInfo]);

  const fetchSessions = useCallback(async ({ silent = false } = {}) => {
    const reqId = ++sessionsReqRef.current;
    if (!silent) {
      setLoadingSessions(true);
    }
    setSessionsError(null);
    try {
      const res = await api.get(`/lecturer/classes/${classId}/sessions`);
      if (reqId !== sessionsReqRef.current) return;
      const payload = extractPayload(res);
      if (payload?.course_class) mergeClassInfo(payload.course_class);
      setSessions(extractList(payload, 'sessions'));
    } catch (err) {
      if (reqId !== sessionsReqRef.current) return;
      setSessionsError(err);
    } finally {
      if (reqId === sessionsReqRef.current && !silent) {
        setLoadingSessions(false);
      }
    }
  }, [classId, mergeClassInfo]);

  const fetchGrades = useCallback(async ({
    silent = false,
    preserveDirty = false,
    resetIds = null,
  } = {}) => {
    const reqId = ++gradesReqRef.current;
    if (!silent) {
      setLoadingGrades(true);
    }
    setGradesError(null);
    try {
      const res = await api.get(`/lecturer/classes/${classId}/grades`);
      if (reqId !== gradesReqRef.current) return;
      const payload = extractPayload(res);
      if (payload?.course_class) mergeClassInfo(payload.course_class);
      const list = extractList(payload, 'participants');

      const prevServerScores = new Map();
      gradeRowsRef.current.forEach((row) => {
        const sc = row.grade?.score;
        prevServerScores.set(
          row.student_id,
          sc !== null && sc !== undefined ? String(sc) : ''
        );
      });

      gradeRowsRef.current = list;
      setGradeRows(list);
      setAllPublished(Boolean(payload?.all_published));
      setDraftScores((prevDrafts) => {
        const nextDrafts = {};
        list.forEach((row) => {
          const sc = row.grade?.score;
          const serverVal = sc !== null && sc !== undefined ? String(sc) : '';
          if (
            preserveDirty &&
            !row.grade?.is_published &&
            !(resetIds && resetIds.has(row.student_id))
          ) {
            const prevDraft = prevDrafts[row.student_id];
            const prevServer = prevServerScores.get(row.student_id) ?? '';
            if (prevDraft !== undefined && prevDraft !== prevServer) {
              nextDrafts[row.student_id] = prevDraft;
              return;
            }
          }
          nextDrafts[row.student_id] = serverVal;
        });
        return nextDrafts;
      });
      setUngradedIds(new Set());
    } catch (err) {
      if (reqId !== gradesReqRef.current) return;
      setGradesError(err);
    } finally {
      if (reqId === gradesReqRef.current && !silent) {
        setLoadingGrades(false);
      }
    }
  }, [classId, mergeClassInfo]);

  useEffect(() => {
    fetchClassHeader();
    fetchParticipants();
    fetchSessions();
    fetchGrades();
    return () => {
      headerReqRef.current += 1;
      participantsReqRef.current += 1;
      sessionsReqRef.current += 1;
      gradesReqRef.current += 1;
      recapReqRef.current += 1;
    };
  }, [fetchClassHeader, fetchParticipants, fetchSessions, fetchGrades]);

  // Tab 2 handlers
  const openCreateSessionModal = () => {
    setEditingSession(null);
    setSessionDateInput(todayDateInput());
    setSessionTopicInput('');
    setSessionModalError(null);
    setSessionModalOpen(true);
  };

  const openEditSessionModal = (session) => {
    setEditingSession(session);
    setSessionDateInput(
      session.session_date ? String(session.session_date).slice(0, 10) : todayDateInput()
    );
    setSessionTopicInput(session.topic ?? '');
    setSessionModalError(null);
    setSessionModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    setSavingSession(true);
    setSessionModalError(null);
    setSessionSuccess('');
    try {
      const body = {
        session_date: sessionDateInput,
        topic: sessionTopicInput.trim(),
      };
      if (editingSession) {
        await api.put(`/lecturer/sessions/${editingSession.id}`, body);
        setSessionSuccess(
          `Pertemuan ${editingSession.session_number} berhasil diperbarui.`
        );
      } else {
        await api.post(`/lecturer/classes/${classId}/sessions`, body);
        setSessionSuccess('Pertemuan baru berhasil dibuat.');
      }
      setSessionModalOpen(false);
      await fetchSessions({ silent: true });
    } catch (err) {
      setSessionModalError(err);
    } finally {
      setSavingSession(false);
    }
  };

  const handleConfirmDeleteSession = async () => {
    if (!deleteTarget) return;
    setDeletingSession(true);
    setDeleteModalError(null);
    setSessionSuccess('');
    try {
      await api.delete(`/lecturer/sessions/${deleteTarget.id}`);
      setSessionSuccess(
        `Pertemuan ${deleteTarget.session_number} berhasil dihapus.`
      );
      setDeleteTarget(null);
      await fetchSessions({ silent: true });
    } catch (err) {
      setDeleteModalError(err);
    } finally {
      setDeletingSession(false);
    }
  };

  const handleChangeAttendanceStatus = async (sessionId, nextStatus) => {
    setStatusBusyId(sessionId);
    setSessionActionError(null);
    setSessionSuccess('');
    try {
      await api.patch(`/lecturer/sessions/${sessionId}/attendance-status`, {
        attendance_status: nextStatus,
      });
      setSessionSuccess(
        nextStatus === 'open'
          ? 'Presensi pertemuan berhasil dibuka.'
          : 'Presensi pertemuan berhasil ditutup.'
      );
      await fetchSessions({ silent: true });
    } catch (err) {
      setSessionActionError(err);
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenTarget) return;
    setReopeningSession(true);
    setReopenModalError(null);
    setSessionSuccess('');
    try {
      await api.patch(
        `/lecturer/sessions/${reopenTarget.id}/attendance-status`,
        {
          attendance_status: 'open',
          reason: reopenReason.trim(),
        }
      );
      setSessionSuccess(
        `Presensi Pertemuan ${reopenTarget.session_number} berhasil dibuka ulang.`
      );
      setReopenTarget(null);
      setReopenReason('');
      await fetchSessions({ silent: true });
    } catch (err) {
      setReopenModalError(err);
    } finally {
      setReopeningSession(false);
    }
  };

  const loadSessionRecap = async (session) => {
    const reqId = ++recapReqRef.current;
    setRecapSession(session);
    setLoadingRecap(true);
    setRecapError(null);
    setRecapSuccess('');
    try {
      const res = await api.get(`/lecturer/sessions/${session.id}/attendances`);
      if (reqId !== recapReqRef.current) return;
      setRecapData(extractPayload(res));
    } catch (err) {
      if (reqId !== recapReqRef.current) return;
      setRecapError(err);
      setRecapData(null);
    } finally {
      if (reqId === recapReqRef.current) {
        setLoadingRecap(false);
      }
    }
  };

  const handleRecapStatusChange = async (studentId, nextStatus) => {
    if (!recapSession || !nextStatus) return;
    setUpdatingStudentId(studentId);
    setRecapError(null);
    setRecapSuccess('');
    try {
      await api.put(
        `/lecturer/sessions/${recapSession.id}/attendances/${studentId}`,
        { status: nextStatus }
      );
      const res = await api.get(
        `/lecturer/sessions/${recapSession.id}/attendances`
      );
      setRecapData(extractPayload(res));
      setRecapSuccess('Status kehadiran mahasiswa diperbarui.');
    } catch (err) {
      setRecapError(err);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Tab 3 handlers
  const draftValidation = useMemo(() => {
    const invalidIds = new Set();
    const changedEntries = [];

    gradeRows.forEach((row) => {
      if (row.grade?.is_published) return;
      const rawVal = draftScores[row.student_id] ?? '';
      const trimmed = String(rawVal).trim();
      const origStr =
        row.grade?.score !== null && row.grade?.score !== undefined
          ? String(row.grade.score)
          : '';

      if (trimmed === '') {
        return;
      }

      const converted = scoreToGrade(trimmed);
      if (!converted) {
        invalidIds.add(row.student_id);
        return;
      }

      const numVal = Number(trimmed);
      const origNum = origStr !== '' ? Number(origStr) : null;
      if (origNum === null || numVal !== origNum) {
        changedEntries.push({
          student_id: row.student_id,
          score: numVal,
        });
      }
    });

    return { invalidIds, changedEntries };
  }, [gradeRows, draftScores]);

  const handleDraftScoreChange = (studentId, value) => {
    setDraftScores((prev) => ({ ...prev, [studentId]: value }));
    setUngradedIds((prev) => {
      if (!prev.has(studentId)) return prev;
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  };

  const handleSaveDraftGrades = async () => {
    if (
      draftValidation.invalidIds.size > 0 ||
      draftValidation.changedEntries.length === 0
    ) {
      return;
    }
    setSavingDrafts(true);
    setGradeActionError(null);
    setGradeSuccess('');
    try {
      const savedIds = new Set(
        draftValidation.changedEntries.map((entry) => entry.student_id)
      );
      await api.put(`/lecturer/classes/${classId}/grades`, {
        grades: draftValidation.changedEntries,
      });
      setGradeSuccess('Draft nilai berhasil disimpan.');
      await fetchGrades({
        silent: true,
        preserveDirty: true,
        resetIds: savedIds,
      });
    } catch (err) {
      setGradeActionError(err);
    } finally {
      setSavingDrafts(false);
    }
  };

  const handlePublishGrades = async () => {
    setPublishingGrades(true);
    setGradeActionError(null);
    setGradeSuccess('');
    try {
      await api.post(`/lecturer/classes/${classId}/grades/publish`);
      setPublishModalOpen(false);
      setGradeSuccess('Nilai kelas berhasil dipublikasikan.');
      await fetchGrades({ silent: true, preserveDirty: true });
    } catch (err) {
      setPublishModalOpen(false);
      setGradeActionError(err);
      const parsed = parseApiError(err);
      if (Array.isArray(parsed?.ungradedStudents)) {
        setUngradedIds(
          new Set(parsed.ungradedStudents.map((s) => s.student_id))
        );
      }
    } finally {
      setPublishingGrades(false);
    }
  };

  const openRevisionModal = (row) => {
    setRevisionTarget(row);
    setRevisionScore(
      row.grade?.score !== null && row.grade?.score !== undefined
        ? String(row.grade.score)
        : ''
    );
    setRevisionReason('');
    setRevisionModalError(null);
  };

  const revisionPreview = useMemo(
    () => scoreToGrade(revisionScore),
    [revisionScore]
  );

  const handleSaveRevision = async (e) => {
    e.preventDefault();
    if (!revisionTarget || !revisionPreview || revisionReason.trim().length < 10) {
      return;
    }
    setSavingRevision(true);
    setRevisionModalError(null);
    setGradeSuccess('');
    try {
      await api.put(`/lecturer/classes/${classId}/grades`, {
        grades: [
          {
            student_id: revisionTarget.student_id,
            score: Number(revisionScore),
            revision_reason: revisionReason.trim(),
          },
        ],
      });
      const revisedId = revisionTarget.student_id;
      setRevisionTarget(null);
      setGradeSuccess(
        `Revisi nilai ${revisionTarget.name} berhasil disimpan dan dicatat di jejak audit.`
      );
      await fetchGrades({
        silent: true,
        preserveDirty: true,
        resetIds: new Set([revisedId]),
      });
    } catch (err) {
      setRevisionModalError(err);
    } finally {
      setSavingRevision(false);
    }
  };

  const sessionModalFieldErrors = useMemo(
    () => (sessionModalError ? parseApiError(sessionModalError).fieldErrors : {}),
    [sessionModalError]
  );

  const reopenModalFieldErrors = useMemo(
    () => (reopenModalError ? parseApiError(reopenModalError).fieldErrors : {}),
    [reopenModalError]
  );

  const revisionModalFieldErrors = useMemo(
    () =>
      revisionModalError ? parseApiError(revisionModalError).fieldErrors : {},
    [revisionModalError]
  );

  const tabItems = [
    {
      key: 'participants',
      label: 'Daftar Peserta',
      badge: participants.length,
    },
    {
      key: 'sessions',
      label: 'Pertemuan & Presensi',
      badge: sessions.length,
    },
    {
      key: 'grades',
      label: 'Penilaian Akhir',
    },
  ];

  const courseCode = classInfo?.course?.course_code ?? classInfo?.course_code ?? '—';
  const courseName =
    classInfo?.course?.course_name ?? classInfo?.course_name ?? 'Detail Kelas';
  const classCode = classInfo?.class_code ?? '';
  const semesterName = classInfo?.semester?.name ?? classInfo?.semester_name ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/lecturer/classes"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-[#1E293B] transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Kelas Diampu
        </Link>
      </div>

      {loadingClassInfo && !classInfo ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-mono text-[13px] font-medium text-[#1E293B]">
                  {courseCode}
                </span>
                {classCode && (
                  <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-0.5 font-mono text-[13px] font-semibold text-[#4338CA]">
                    Kelas {classCode}
                  </span>
                )}
                {semesterName && (
                  <StatusBadge tone="slate" label={semesterName} />
                )}
              </div>
              <h1 className="mt-2 font-heading text-2xl font-bold text-[#1E293B]">
                {courseName} {classCode}
              </h1>
            </div>

            {classInfo && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-[#4F46E5]" />
                  {formatDayName(classInfo.day_of_week)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[#1E293B]">
                  <Clock className="h-4 w-4 text-[#4F46E5]" />
                  {formatTimeRange(classInfo.start_time, classInfo.end_time)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[#1E293B]">
                  <MapPin className="h-4 w-4 text-[#4F46E5]" />
                  {classInfo.room || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[#1E293B]">
                  <Users className="h-4 w-4 text-[#4F46E5]" />
                  {classInfo.enrolled_count ?? participants.length}/
                  {classInfo.quota ?? '—'}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      <Tabs tabs={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      {/* TAB 1: DAFTAR PESERTA */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          {participantsError && <AlertBanner error={participantsError} />}

          {loadingParticipants ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Card
              title="Daftar Peserta Kelas"
              subtitle={`Total ${participants.length} mahasiswa terkonfirmasi`}
              padding="p-0"
            >
              {participants.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Users}
                    title="Belum ada peserta"
                    description="Belum ada mahasiswa dengan KRS terkonfirmasi di kelas ini."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">No</th>
                        <th className="px-5 py-3.5 font-semibold">NIM</th>
                        <th className="px-5 py-3.5 font-semibold">Nama Mahasiswa</th>
                        <th className="px-5 py-3.5 font-semibold">Program Studi</th>
                        <th className="px-5 py-3.5 font-semibold">Status KRS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants.map((p, idx) => (
                        <tr
                          key={p.student_id ?? p.student_number ?? idx}
                          className="transition-colors hover:bg-slate-50/60"
                        >
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-[#64748B]">
                            {idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] font-medium text-[#1E293B]">
                            {p.student_number}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[#1E293B]">
                            {p.name}
                          </td>
                          <td className="px-5 py-3.5 text-[#64748B]">
                            {p.study_program || '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <StatusBadge
                              type="studyPlan"
                              value={p.study_plan_status ?? 'confirmed'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: PERTEMUAN & PRESENSI */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-[#1E293B]">
                Pertemuan & Kontrol Presensi
              </h2>
              <p className="text-sm text-[#64748B]">
                Buat sesi pertemuan, buka/tutup presensi, dan kelola rekap kehadiran mahasiswa.
              </p>
            </div>
            <LoadingButton
              variant="primary"
              icon={Plus}
              onClick={openCreateSessionModal}
            >
              Buat Pertemuan
            </LoadingButton>
          </div>

          {sessionsError && <AlertBanner error={sessionsError} />}
          {sessionActionError && (
            <AlertBanner
              error={sessionActionError}
              onDismiss={() => setSessionActionError(null)}
            />
          )}
          {sessionSuccess && (
            <AlertBanner
              variant="success"
              message={sessionSuccess}
              onDismiss={() => setSessionSuccess('')}
            />
          )}

          {loadingSessions ? (
            <Skeleton className="h-64 w-full" />
          ) : sessions.length === 0 ? (
            <Card>
              <EmptyState
                icon={CalendarDays}
                title="Belum ada pertemuan"
                description="Klik tombol Buat Pertemuan untuk menambahkan sesi kuliah pertama."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const status = session.attendance_status;
                const isStatusBusy = statusBusyId === session.id;
                return (
                  <Card key={session.id}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#4338CA]">
                            Pertemuan {session.session_number}
                          </span>
                          <StatusBadge type="session" value={status} />
                          <span className="text-xs text-[#64748B]">
                            {formatDateId(session.session_date)}
                          </span>
                        </div>
                        <h3 className="font-heading text-base font-semibold text-[#1E293B]">
                          {session.topic || 'Tanpa topik'}
                        </h3>
                        {(session.opened_at || session.closed_at) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
                            {session.opened_at && (
                              <span>
                                Dibuka: {formatWibDateTime(session.opened_at)}
                              </span>
                            )}
                            {session.closed_at && (
                              <span>
                                Ditutup: {formatWibDateTime(session.closed_at)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {status === 'not_opened' && (
                          <>
                            <LoadingButton
                              variant="primary"
                              size="sm"
                              icon={LockOpen}
                              loading={isStatusBusy}
                              disabled={isStatusBusy}
                              onClick={() =>
                                handleChangeAttendanceStatus(session.id, 'open')
                              }
                            >
                              Buka Presensi
                            </LoadingButton>
                            <LoadingButton
                              variant="secondary"
                              size="sm"
                              icon={Edit3}
                              onClick={() => openEditSessionModal(session)}
                            >
                              Ubah
                            </LoadingButton>
                            <LoadingButton
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => {
                                setDeleteModalError(null);
                                setDeleteTarget(session);
                              }}
                            >
                              Hapus
                            </LoadingButton>
                          </>
                        )}

                        {status === 'open' && (
                          <>
                            <LoadingButton
                              variant="secondary"
                              size="sm"
                              icon={XCircle}
                              loading={isStatusBusy}
                              disabled={isStatusBusy}
                              onClick={() =>
                                handleChangeAttendanceStatus(session.id, 'closed')
                              }
                            >
                              Tutup Presensi
                            </LoadingButton>
                            <LoadingButton
                              variant="secondary"
                              size="sm"
                              icon={Edit3}
                              onClick={() => openEditSessionModal(session)}
                            >
                              Ubah
                            </LoadingButton>
                          </>
                        )}

                        {status === 'closed' && (
                          <>
                            <LoadingButton
                              variant="soft"
                              size="sm"
                              icon={RotateCcw}
                              onClick={() => {
                                setReopenTarget(session);
                                setReopenReason('');
                                setReopenModalError(null);
                              }}
                            >
                              Buka Ulang Presensi
                            </LoadingButton>
                            <LoadingButton
                              variant="secondary"
                              size="sm"
                              icon={Edit3}
                              onClick={() => openEditSessionModal(session)}
                            >
                              Ubah
                            </LoadingButton>
                          </>
                        )}

                        <LoadingButton
                          variant="soft"
                          size="sm"
                          icon={ClipboardList}
                          onClick={() => loadSessionRecap(session)}
                        >
                          Rekap Presensi
                        </LoadingButton>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PENILAIAN AKHIR */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          {gradesError && <AlertBanner error={gradesError} />}
          {gradeActionError && (
            <AlertBanner
              error={gradeActionError}
              onDismiss={() => setGradeActionError(null)}
            />
          )}
          {gradeSuccess && (
            <AlertBanner
              variant="success"
              message={gradeSuccess}
              onDismiss={() => setGradeSuccess('')}
            />
          )}
          {allPublished && gradeRows.length > 0 && (
            <AlertBanner
              variant="info"
              message="Seluruh nilai telah dipublikasikan. Gunakan tombol Revisi pada baris mahasiswa untuk mengoreksi."
            />
          )}

          {loadingGrades ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Card
              title="Penilaian Akhir Kelas"
              subtitle="Skala nilai BR-13 dihitung otomatis dari nilai angka (0–100)."
              padding="p-0"
            >
              {gradeRows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Users}
                    title="Belum ada peserta"
                    description="Belum ada mahasiswa terkonfirmasi untuk dinilai pada kelas ini."
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748B]">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold">NIM</th>
                          <th className="px-5 py-3.5 font-semibold">Nama Mahasiswa</th>
                          <th className="px-5 py-3.5 font-semibold">Nilai (0–100)</th>
                          <th className="px-5 py-3.5 font-semibold">Pratinjau</th>
                          <th className="px-5 py-3.5 font-semibold">Status</th>
                          <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {gradeRows.map((row) => {
                          const published = Boolean(row.grade?.is_published);
                          const currentVal = draftScores[row.student_id] ?? '';
                          const isInvalid = draftValidation.invalidIds.has(
                            row.student_id
                          );
                          const isUngraded = ungradedIds.has(row.student_id);
                          const preview = published
                            ? row.grade
                              ? {
                                  grade_letter: row.grade.grade_letter,
                                  grade_point: Number(row.grade.grade_point),
                                }
                              : null
                            : scoreToGrade(currentVal);

                          return (
                            <tr
                              key={row.student_id}
                              className={`transition-colors ${
                                isUngraded
                                  ? 'bg-[#FFF1F2]/60'
                                  : 'hover:bg-slate-50/60'
                              }`}
                            >
                              <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] font-medium text-[#1E293B]">
                                {row.student_number}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="font-medium text-[#1E293B]">
                                  {row.name}
                                </div>
                                {isUngraded && (
                                  <p className="mt-0.5 text-xs font-medium text-[#BE123C]">
                                    Belum ada nilai
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="w-32">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    disabled={published}
                                    value={currentVal}
                                    onChange={(e) =>
                                      handleDraftScoreChange(
                                        row.student_id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="0–100"
                                    aria-label={`Nilai ${row.name}`}
                                    className={`h-9 w-full rounded-xl border bg-white px-3 font-mono text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 disabled:bg-slate-100 disabled:text-[#64748B] ${
                                      isInvalid
                                        ? 'border-[#FECDD3] focus:border-[#F43F5E]'
                                        : 'border-slate-200 focus:border-[#4F46E5]'
                                    }`}
                                  />
                                  {isInvalid && (
                                    <p className="mt-1 text-xs text-[#BE123C]">
                                      Nilai harus 0–100
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5">
                                {preview ? (
                                  <StatusBadge
                                    tone="slate"
                                    label={`${preview.grade_letter} • ${Number(
                                      preview.grade_point
                                    ).toFixed(2)}`}
                                  />
                                ) : (
                                  <span className="font-mono text-sm text-[#64748B]">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5">
                                <StatusBadge type="published" value={published} />
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                {published ? (
                                  <LoadingButton
                                    variant="soft"
                                    size="sm"
                                    icon={Edit3}
                                    onClick={() => openRevisionModal(row)}
                                  >
                                    Revisi
                                  </LoadingButton>
                                ) : (
                                  <span className="text-xs text-[#64748B]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#64748B]">
                      {draftValidation.changedEntries.length > 0
                        ? `${draftValidation.changedEntries.length} perubahan nilai belum disimpan.`
                        : 'Simpan draft sebelum mempublikasikan nilai ke KHS mahasiswa.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <LoadingButton
                        variant="secondary"
                        icon={Save}
                        loading={savingDrafts}
                        disabled={
                          savingDrafts ||
                          draftValidation.invalidIds.size > 0 ||
                          draftValidation.changedEntries.length === 0
                        }
                        onClick={handleSaveDraftGrades}
                      >
                        Simpan Draft Nilai
                      </LoadingButton>
                      <LoadingButton
                        variant="primary"
                        icon={Send}
                        disabled={allPublished || gradeRows.length === 0}
                        onClick={() => {
                          setGradeActionError(null);
                          setPublishModalOpen(true);
                        }}
                      >
                        Publikasikan Nilai Kelas
                      </LoadingButton>
                    </div>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT SESSION */}
      <Modal
        isOpen={sessionModalOpen}
        onClose={() => !savingSession && setSessionModalOpen(false)}
        dismissible={!savingSession}
        title={
          editingSession
            ? `Ubah Pertemuan ${editingSession.session_number}`
            : 'Buat Pertemuan Baru'
        }
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={savingSession}
              onClick={() => setSessionModalOpen(false)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              type="submit"
              form="session-form"
              variant="primary"
              loading={savingSession}
            >
              Simpan
            </LoadingButton>
          </>
        }
      >
        <form id="session-form" onSubmit={handleSaveSession} className="space-y-4">
          {sessionModalError && <AlertBanner error={sessionModalError} />}

          {!editingSession && (
            <AlertBanner
              variant="info"
              message="Nomor pertemuan diberikan otomatis secara berurutan oleh sistem."
            />
          )}

          <div>
            <label
              htmlFor="session-date-input"
              className="mb-1.5 block text-sm font-medium text-[#1E293B]"
            >
              Tanggal Pertemuan
            </label>
            <input
              id="session-date-input"
              type="date"
              required
              value={sessionDateInput}
              onChange={(e) => setSessionDateInput(e.target.value)}
              className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 ${
                sessionModalFieldErrors.session_date
                  ? 'border-[#FECDD3]'
                  : 'border-slate-200 focus:border-[#4F46E5]'
              }`}
            />
            {sessionModalFieldErrors.session_date?.[0] && (
              <p className="mt-1 text-xs text-[#BE123C]">
                {sessionModalFieldErrors.session_date[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="session-topic-input"
              className="mb-1.5 block text-sm font-medium text-[#1E293B]"
            >
              Topik Perkuliahan
            </label>
            <input
              id="session-topic-input"
              type="text"
              required
              maxLength={255}
              placeholder="Contoh: Normalisasi Basis Data & ERD"
              value={sessionTopicInput}
              onChange={(e) => setSessionTopicInput(e.target.value)}
              className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 ${
                sessionModalFieldErrors.topic
                  ? 'border-[#FECDD3]'
                  : 'border-slate-200 focus:border-[#4F46E5]'
              }`}
            />
            {sessionModalFieldErrors.topic?.[0] && (
              <p className="mt-1 text-xs text-[#BE123C]">
                {sessionModalFieldErrors.topic[0]}
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL: DELETE SESSION CONFIRM */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deletingSession && setDeleteTarget(null)}
        dismissible={!deletingSession}
        size="sm"
        title="Hapus Pertemuan?"
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={deletingSession}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              variant="danger"
              icon={Trash2}
              loading={deletingSession}
              onClick={handleConfirmDeleteSession}
            >
              Ya, Hapus
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-3">
          {deleteModalError && <AlertBanner error={deleteModalError} />}
          <p className="text-sm text-[#1E293B]">
            Pertemuan{' '}
            <span className="font-semibold">
              {deleteTarget?.session_number} ({deleteTarget?.topic})
            </span>{' '}
            akan dihapus dan pertemuan selanjutnya akan dinomori ulang.
          </p>
        </div>
      </Modal>

      {/* MODAL: RE-OPEN SESSION */}
      <Modal
        isOpen={Boolean(reopenTarget)}
        onClose={() => !reopeningSession && setReopenTarget(null)}
        dismissible={!reopeningSession}
        title={`Buka Ulang Presensi Pertemuan ${reopenTarget?.session_number ?? ''}`}
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={reopeningSession}
              onClick={() => setReopenTarget(null)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              type="submit"
              form="reopen-session-form"
              variant="primary"
              loading={reopeningSession}
              disabled={reopeningSession || reopenReason.trim().length < 5}
            >
              Buka Ulang
            </LoadingButton>
          </>
        }
      >
        <form
          id="reopen-session-form"
          onSubmit={handleReopenSubmit}
          className="space-y-4"
        >
          {reopenModalError && <AlertBanner error={reopenModalError} />}
          <AlertBanner
            variant="info"
            message="Data presensi yang sudah tercatat tetap dipertahankan. Aktivitas dicatat pada jejak audit."
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="reopen-reason-input"
                className="text-sm font-medium text-[#1E293B]"
              >
                Alasan Pembukaan Ulang
              </label>
              <span className="font-mono text-xs text-[#64748B]">
                {reopenReason.trim().length}/5 min
              </span>
            </div>
            <textarea
              id="reopen-reason-input"
              rows={3}
              required
              placeholder="Minimal 5 karakter, misal: Mahasiswa mengalami kendala jaringan saat sesi berlangsung."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className={`w-full rounded-xl border bg-white p-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 ${
                reopenModalFieldErrors.reason
                  ? 'border-[#FECDD3]'
                  : 'border-slate-200 focus:border-[#4F46E5]'
              }`}
            />
            {reopenModalFieldErrors.reason?.[0] && (
              <p className="mt-1 text-xs text-[#BE123C]">
                {reopenModalFieldErrors.reason[0]}
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL: REKAP PRESENSI */}
      <Modal
        isOpen={Boolean(recapSession)}
        onClose={() => !updatingStudentId && setRecapSession(null)}
        dismissible={!updatingStudentId}
        size="xl"
        title={
          recapSession
            ? `Rekap Presensi — Pertemuan ${recapSession.session_number}`
            : 'Rekap Presensi'
        }
        footer={
          <LoadingButton
            variant="secondary"
            onClick={() => setRecapSession(null)}
          >
            Tutup
          </LoadingButton>
        }
      >
        <div className="space-y-4">
          {recapError && (
            <AlertBanner
              error={recapError}
              onDismiss={() => setRecapError(null)}
            />
          )}
          {recapSuccess && (
            <AlertBanner
              variant="success"
              message={recapSuccess}
              onDismiss={() => setRecapSuccess('')}
            />
          )}

          {loadingRecap ? (
            <Skeleton className="h-56 w-full" />
          ) : recapData ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone="emerald"
                  label={`Hadir ${recapData.summary?.present ?? 0}`}
                />
                <StatusBadge
                  tone="amber"
                  label={`Izin ${recapData.summary?.excused ?? 0}`}
                />
                <StatusBadge
                  tone="amber"
                  label={`Sakit ${recapData.summary?.sick ?? 0}`}
                />
                <StatusBadge
                  tone="rose"
                  label={`Alpa ${recapData.summary?.absent ?? 0}`}
                />
                <StatusBadge
                  tone="slate"
                  label={`Belum mengisi ${recapData.summary?.unrecorded ?? 0}`}
                />
              </div>

              {Array.isArray(recapData.participants) &&
              recapData.participants.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">NIM</th>
                        <th className="px-4 py-3 font-semibold">Nama</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Waktu</th>
                        <th className="px-4 py-3 font-semibold">Ubah Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recapData.participants.map((p) => {
                        const isBusy = updatingStudentId === p.student_id;
                        return (
                          <tr
                            key={p.student_id}
                            className="transition-colors hover:bg-slate-50/60"
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] font-medium text-[#1E293B]">
                              {p.student_number}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#1E293B]">
                              {p.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <StatusBadge type="attendance" value={p.status} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#64748B]">
                              {p.recorded_at
                                ? formatWibTime(p.recorded_at)
                                : '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <select
                                aria-label={`Ubah status ${p.name}`}
                                value={p.status ?? ''}
                                disabled={isBusy}
                                onChange={(e) =>
                                  handleRecapStatusChange(
                                    p.student_id,
                                    e.target.value
                                  )
                                }
                                className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-[#1E293B] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 disabled:bg-slate-100 disabled:text-[#64748B]"
                              >
                                <option value="" disabled>
                                  Pilih status...
                                </option>
                                <option value="present">Hadir</option>
                                <option value="excused">Izin</option>
                                <option value="sick">Sakit</option>
                                <option value="absent">Alpa</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Belum ada peserta"
                  description="Tidak ada peserta terkonfirmasi di kelas ini."
                />
              )}
            </>
          ) : null}
        </div>
      </Modal>

      {/* MODAL: PUBLISH GRADES CONFIRM */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => !publishingGrades && setPublishModalOpen(false)}
        dismissible={!publishingGrades}
        size="sm"
        title="Publikasikan Nilai Kelas?"
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={publishingGrades}
              onClick={() => setPublishModalOpen(false)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              variant="primary"
              icon={CheckCircle2}
              loading={publishingGrades}
              onClick={handlePublishGrades}
            >
              Ya, Publikasikan
            </LoadingButton>
          </>
        }
      >
        <p className="text-sm text-[#1E293B]">
          Seluruh nilai kelas akan tampil di KHS mahasiswa. Pastikan seluruh draft
          nilai telah disimpan sebelum publikasi.
        </p>
      </Modal>

      {/* MODAL: REVISE PUBLISHED GRADE */}
      <Modal
        isOpen={Boolean(revisionTarget)}
        onClose={() => !savingRevision && setRevisionTarget(null)}
        dismissible={!savingRevision}
        title="Revisi Nilai Terpublikasi"
        footer={
          <>
            <LoadingButton
              variant="secondary"
              disabled={savingRevision}
              onClick={() => setRevisionTarget(null)}
            >
              Batal
            </LoadingButton>
            <LoadingButton
              type="submit"
              form="revision-grade-form"
              variant="primary"
              loading={savingRevision}
              disabled={
                savingRevision ||
                !revisionPreview ||
                revisionReason.trim().length < 10
              }
            >
              Simpan Revisi
            </LoadingButton>
          </>
        }
      >
        <form
          id="revision-grade-form"
          onSubmit={handleSaveRevision}
          className="space-y-4"
        >
          {revisionModalError && <AlertBanner error={revisionModalError} />}
          <AlertBanner
            variant="info"
            message="Revisi dicatat pada jejak audit (nilai sebelum & sesudah)."
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-mono text-xs text-[#64748B]">
              {revisionTarget?.student_number}
            </p>
            <p className="font-semibold text-[#1E293B]">
              {revisionTarget?.name}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Nilai saat ini:{' '}
              <span className="font-mono font-semibold text-[#1E293B]">
                {revisionTarget?.grade?.score ?? '—'} (
                {revisionTarget?.grade?.grade_letter ?? '—'})
              </span>
            </p>
          </div>

          <div>
            <label
              htmlFor="revision-score-input"
              className="mb-1.5 block text-sm font-medium text-[#1E293B]"
            >
              Nilai Baru (0–100)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="revision-score-input"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={revisionScore}
                onChange={(e) => setRevisionScore(e.target.value)}
                className={`h-10 w-40 rounded-xl border bg-white px-3 font-mono text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 ${
                  revisionScore !== '' && !revisionPreview
                    ? 'border-[#FECDD3]'
                    : 'border-slate-200 focus:border-[#4F46E5]'
                }`}
              />
              {revisionPreview ? (
                <StatusBadge
                  tone="slate"
                  label={`${revisionPreview.grade_letter} • ${revisionPreview.grade_point.toFixed(
                    2
                  )}`}
                />
              ) : (
                <span className="font-mono text-sm text-[#64748B]">—</span>
              )}
            </div>
            {revisionScore !== '' && !revisionPreview && (
              <p className="mt-1 text-xs text-[#BE123C]">Nilai harus 0–100</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="revision-reason-input"
                className="text-sm font-medium text-[#1E293B]"
              >
                Alasan Revisi
              </label>
              <span className="font-mono text-xs text-[#64748B]">
                {revisionReason.trim().length}/10 min
              </span>
            </div>
            <textarea
              id="revision-reason-input"
              rows={3}
              required
              placeholder="Minimal 10 karakter, misal: Koreksi salah input nilai UAS setelah verifikasi lembar jawaban."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              className={`w-full rounded-xl border bg-white p-3 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 ${
                revisionModalFieldErrors.revision_reason
                  ? 'border-[#FECDD3]'
                  : 'border-slate-200 focus:border-[#4F46E5]'
              }`}
            />
            {revisionModalFieldErrors.revision_reason?.[0] && (
              <p className="mt-1 text-xs text-[#BE123C]">
                {revisionModalFieldErrors.revision_reason[0]}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default LecturerClassDetailPage;
