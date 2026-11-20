import { Award, BookOpen, CheckCircle2 } from 'lucide-react';
import {
  AlertBanner,
  Card,
  EmptyState,
  Skeleton,
  StatusBadge,
} from '../ui';

/**
 * Reusable KHS / Transcript viewer for Student and Admin monitoring pages.
 * Enforces NFR-06: unpublished grades render '—' and 'Belum Dipublikasikan'.
 *
 * @param {{ data: object|null, loading?: boolean, error?: any }} props
 */
export function TranscriptView({ data, loading = false, error = null }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <AlertBanner error={error} />;
  }

  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title="Belum ada data KHS"
          description="Pilih semester untuk melihat Kartu Hasil Studi."
        />
      </Card>
    );
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const summary = data.summary || {};
  const enrolledCredits = Number(summary.total_enrolled_credits ?? 0);
  const publishedCredits = Number(summary.total_published_credits ?? 0);
  const gpa = Number(summary.gpa ?? 0);
  const hasPublished = publishedCredits > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#64748B]">
                Indeks Prestasi Semester (IPS)
              </p>
              <p className="mt-2 font-heading text-4xl font-bold tracking-tight text-[#4338CA]">
                {gpa.toFixed(2)}
              </p>
              {!hasPublished && (
                <p className="mt-1.5 text-xs text-[#64748B]">
                  Belum ada nilai terpublikasi
                </p>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#64748B]">
                Total SKS Diambil
              </p>
              <p className="mt-2 font-heading text-2xl font-bold text-[#1E293B]">
                {enrolledCredits}{' '}
                <span className="text-sm font-normal text-[#64748B]">SKS</span>
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                KRS terkonfirmasi semester ini
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#64748B]">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#64748B]">
                SKS Terpublikasi
              </p>
              <p className="mt-2 font-heading text-2xl font-bold text-[#1E293B]">
                {publishedCredits}{' '}
                <span className="text-sm font-normal text-[#64748B]">
                  / {enrolledCredits} SKS
                </span>
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Dasar perhitungan IPS
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#047857]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Daftar Nilai Mata Kuliah"
        subtitle={
          data.semester?.name
            ? `${data.semester.name}${data.student?.name ? ` • ${data.student.name}` : ''}`
            : undefined
        }
        padding="p-0"
      >
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookOpen}
              title="Belum ada mata kuliah"
              description="Belum ada mata kuliah pada KRS terkonfirmasi untuk semester ini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Kode MK</th>
                  <th className="px-5 py-3.5 font-semibold">Mata Kuliah</th>
                  <th className="px-5 py-3.5 font-semibold">Kelas</th>
                  <th className="px-5 py-3.5 font-semibold text-right">SKS</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Nilai Angka</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Huruf</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Bobot</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const published = item.is_published === true;
                  const scoreText =
                    published && item.score !== null && item.score !== undefined
                      ? Number(item.score).toFixed(2)
                      : '—';
                  const letterText =
                    published && item.grade_letter ? item.grade_letter : '—';
                  const pointText =
                    published &&
                    item.grade_point !== null &&
                    item.grade_point !== undefined
                      ? Number(item.grade_point).toFixed(2)
                      : '—';

                  return (
                    <tr
                      key={item.study_plan_item_id ?? `${item.course_code}-${item.class_code}`}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] font-medium text-[#1E293B]">
                        {item.course_code}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#1E293B]">
                        {item.course_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-[#64748B]">
                        {item.class_code}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-[13px] text-[#1E293B]">
                        {item.credits}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-[13px] text-[#1E293B]">
                        {scoreText}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center font-mono text-[13px] font-semibold text-[#1E293B]">
                        {letterText}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-[13px] text-[#1E293B]">
                        {pointText}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <StatusBadge type="published" value={published} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TranscriptView;
