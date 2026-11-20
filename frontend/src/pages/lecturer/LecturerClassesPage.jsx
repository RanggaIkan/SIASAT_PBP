import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Presentation,
  Users,
} from 'lucide-react';
import api, { unwrapList } from '../../lib/api';
import { formatDayName, formatTimeHm } from '../../lib/datetime';
import {
  AlertBanner,
  Card,
  EmptyState,
  Skeleton,
  StatusBadge,
} from '../../components/ui';

function formatTimeRange(start, end) {
  return `${formatTimeHm(start)}–${formatTimeHm(end)}`;
}

export function LecturerClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadClasses() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/lecturer/classes');
        if (!active) return;
        setClasses(unwrapList(res));
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClasses();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1E293B]">
          Kelas Diampu
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Pilih kelas paralel untuk mengelola pertemuan, presensi, dan penilaian akhir.
        </p>
      </div>

      {error && <AlertBanner error={error} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Presentation}
            title="Belum ada kelas yang diampu"
            description="Anda belum ditugaskan pada kelas paralel manapun untuk semester aktif."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => {
            const courseCode = cls.course?.course_code ?? cls.course_code ?? '—';
            const courseName = cls.course?.course_name ?? cls.course_name ?? 'Mata Kuliah';
            const credits = cls.course?.credits ?? cls.credits;
            const semesterName = cls.semester?.name ?? cls.semester_name ?? '';
            const enrolled = Number(cls.enrolled_count ?? 0);
            const quota = Number(cls.quota ?? 0);
            const ratio = quota > 0 ? Math.min(100, Math.round((enrolled / quota) * 100)) : 0;

            return (
              <Card key={cls.id} className="flex flex-col justify-between transition hover:border-indigo-200">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[13px] font-medium text-[#1E293B]">
                        {courseCode}
                      </span>
                      <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 font-mono text-[13px] font-semibold text-[#4338CA]">
                        Kelas {cls.class_code}
                      </span>
                    </div>
                    {credits !== undefined && credits !== null && (
                      <StatusBadge tone="slate" label={`${credits} SKS`} />
                    )}
                  </div>

                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[#1E293B]">
                      {courseName} {cls.class_code}
                    </h2>
                    {semesterName && (
                      <p className="mt-0.5 text-xs text-[#64748B]">{semesterName}</p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-[#64748B]">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#4F46E5]" />
                      <span>{formatDayName(cls.day_of_week)}</span>
                      <span className="text-slate-300">•</span>
                      <Clock className="h-4 w-4 text-[#4F46E5]" />
                      <span className="font-mono text-[13px] text-[#1E293B]">
                        {formatTimeRange(cls.start_time, cls.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#4F46E5]" />
                      <span>Ruang</span>
                      <span className="font-mono text-[13px] text-[#1E293B]">
                        {cls.room || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#64748B]">
                        <Users className="h-3.5 w-3.5" />
                        Peserta Terdaftar
                      </span>
                      <span className="font-mono font-semibold text-[#1E293B]">
                        {enrolled}/{quota}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          enrolled >= quota && quota > 0
                            ? 'bg-[#F43F5E]'
                            : 'bg-[#4F46E5]'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <Link
                    to={`/lecturer/classes/${cls.id}`}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#EEF2FF] px-4 text-sm font-medium text-[#4338CA] transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40"
                  >
                    Buka Kelas
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LecturerClassesPage;
