import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import api, { unwrapData, unwrapList } from '../../lib/api';
import { AlertBanner, Card, EmptyState, Skeleton } from '../../components/ui';
import TranscriptView from '../../components/academic/TranscriptView';

export function TranscriptPage() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [semesterError, setSemesterError] = useState(null);

  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSemesters() {
      setLoadingSemesters(true);
      setSemesterError(null);
      try {
        const res = await api.get('/student/semesters');
        if (!active) return;
        const list = unwrapList(res);
        setSemesters(list);
        const activeSemester = list.find((s) => s.is_active) || list[0];
        if (activeSemester) {
          setSelectedSemesterId(String(activeSemester.id));
        }
      } catch (err) {
        if (active) setSemesterError(err);
      } finally {
        if (active) setLoadingSemesters(false);
      }
    }

    loadSemesters();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSemesterId) return;
    let active = true;

    async function loadTranscript() {
      setLoadingTranscript(true);
      setTranscriptError(null);
      try {
        const res = await api.get('/student/transcript', {
          params: { semester_id: selectedSemesterId },
        });
        if (!active) return;
        setTranscript(unwrapData(res));
      } catch (err) {
        if (active) {
          setTranscriptError(err);
          setTranscript(null);
        }
      } finally {
        if (active) setLoadingTranscript(false);
      }
    }

    loadTranscript();
    return () => {
      active = false;
    };
  }, [selectedSemesterId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1E293B]">
            Kartu Hasil Studi (KHS)
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Rekap nilai mata kuliah terpublikasi dan Indeks Prestasi Semester.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label
            htmlFor="transcript-semester-select"
            className="mb-1.5 block text-xs font-medium text-[#64748B]"
          >
            Pilih Semester
          </label>
          <select
            id="transcript-semester-select"
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            disabled={loadingSemesters || semesters.length === 0}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#1E293B] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 disabled:bg-slate-100 disabled:text-[#64748B]"
          >
            {semesters.length === 0 ? (
              <option value="">Tidak ada semester</option>
            ) : (
              semesters.map((semester) => (
                <option key={semester.id} value={String(semester.id)}>
                  {semester.name}
                  {semester.is_active ? ' (Aktif)' : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {semesterError && <AlertBanner error={semesterError} />}

      {loadingSemesters ? (
        <Skeleton className="h-64 w-full" />
      ) : semesters.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="Belum ada data semester"
            description="Data semester belum tersedia di sistem."
          />
        </Card>
      ) : (
        <TranscriptView
          data={transcript}
          loading={loadingTranscript}
          error={transcriptError}
        />
      )}
    </div>
  );
}

export default TranscriptPage;
