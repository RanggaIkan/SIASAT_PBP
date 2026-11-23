import React from 'react'
import { createPortal } from 'react-dom'
import { formatDayName, formatTimeHm } from '../../lib/datetime'

function formatPrintDate() {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date())
}

export function StudyPlanPrintCard({ studyPlan, semester, student, studentName }) {
  const items = Array.isArray(studyPlan?.items) ? studyPlan.items : []
  const totalCredits = Number(
    studyPlan?.total_credits ??
      items.reduce((sum, item) => sum + Number(item.course_class?.course?.credits || 0), 0)
  )

  return createPortal(
    <section id="krs-print-card" className="hidden" aria-hidden="true">
      <header className="krs-print-header">
        <p className="krs-print-brand">SIASAT · SISTEM INFORMASI AKADEMIK TERPADU</p>
        <h1>Kartu Rencana Studi</h1>
        <p>{semester?.name || 'Semester'}</p>
      </header>

      <dl className="krs-print-student">
        <div>
          <dt>Nama mahasiswa</dt>
          <dd>{studentName || '—'}</dd>
        </div>
        <div>
          <dt>NIM</dt>
          <dd>{student?.student_number || '—'}</dd>
        </div>
        <div>
          <dt>Program studi</dt>
          <dd>{student?.study_program || '—'}</dd>
        </div>
        <div>
          <dt>Status KRS</dt>
          <dd>Terkonfirmasi</dd>
        </div>
      </dl>

      <table className="krs-print-table">
        <thead>
          <tr>
            <th>Mata kuliah</th>
            <th>Kelas</th>
            <th className="krs-print-credit-column">SKS</th>
            <th>Dosen pengampu</th>
            <th>Jadwal</th>
            <th>Ruang</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const courseClass = item.course_class || {}
            const course = courseClass.course || {}
            const lecturer = courseClass.lecturer?.user?.name || '—'

            return (
              <tr key={item.id || item.course_class_id}>
                <td>
                  <strong>{course.course_code || '—'}</strong>
                  <span>{course.course_name || 'Mata kuliah'}</span>
                </td>
                <td>{courseClass.class_code || '—'}</td>
                <td className="krs-print-credit-column">{Number(course.credits || 0)}</td>
                <td>{lecturer}</td>
                <td>
                  {formatDayName(courseClass.day_of_week)}, {formatTimeHm(courseClass.start_time)}–
                  {formatTimeHm(courseClass.end_time)}
                </td>
                <td>{courseClass.room || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="krs-print-summary">
        <div className="krs-print-total-credits">
          <span>Total beban studi</span>
          <strong>{totalCredits} SKS</strong>
        </div>
        <span>Dicetak pada {formatPrintDate()} · Zona waktu WIB</span>
      </div>
      <p className="krs-print-footnote">
        Kartu ini memuat kelas yang tercatat pada KRS final di SIASAT.
      </p>
    </section>,
    document.body
  )
}

export default StudyPlanPrintCard
