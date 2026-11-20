import React, { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const ROUTE_TITLES = [
  ['/admin/students', 'Manajemen Mahasiswa'],
  ['/admin/lecturers', 'Manajemen Dosen'],
  ['/admin/courses', 'Manajemen Mata Kuliah'],
  ['/admin/semesters', 'Manajemen Semester'],
  ['/admin/classes', 'Manajemen Kelas Paralel'],
  ['/admin/transcripts', 'Monitoring KHS Mahasiswa'],
  ['/admin/audit-logs', 'Jejak Audit Sistem'],
  ['/student/krs', 'Kartu Rencana Studi (KRS)'],
  ['/student/schedule', 'Jadwal Kuliah'],
  ['/student/attendance', 'Presensi Perkuliahan'],
  ['/student/transcript', 'Kartu Hasil Studi (KHS)'],
  ['/lecturer/classes/', 'Detail Kelas Perkuliahan'],
  ['/lecturer/classes', 'Kelas Diampu'],
]

function inferTitle(pathname) {
  const match = ROUTE_TITLES.find(([prefix]) => pathname.startsWith(prefix))
  return match ? match[1] : 'SIASAT'
}

/**
 * Shared Soft Daylight shell with fixed desktop sidebar, mobile drawer, and topbar.
 * @param {object} props
 * @param {string} [props.title]
 * @param {object} [props.semesterOverride]
 * @param {React.ReactNode} props.children
 */
export function AppLayout({ title, semesterOverride, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, activeSemester, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const resolvedTitle = title || inferTitle(location.pathname)

  const handleOpenMenu = useCallback(() => setSidebarOpen(true), [])
  const handleCloseMenu = useCallback(() => setSidebarOpen(false), [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className="min-h-screen bg-slate-50 text-[#1E293B]">
      <Sidebar
        role={user?.role}
        open={sidebarOpen}
        onClose={handleCloseMenu}
        onLogout={handleLogout}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title={resolvedTitle}
          user={user}
          activeSemester={activeSemester}
          semesterOverride={semesterOverride}
          onOpenMenu={handleOpenMenu}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
