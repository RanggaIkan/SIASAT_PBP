import React, { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Presentation,
  ScrollText,
  Users,
  UserSquare,
  X,
} from 'lucide-react'

const NAV_BY_ROLE = {
  admin: [
    { label: 'Mahasiswa', to: '/admin/students', icon: Users },
    { label: 'Dosen', to: '/admin/lecturers', icon: UserSquare },
    { label: 'Mata Kuliah', to: '/admin/courses', icon: BookOpen },
    { label: 'Semester', to: '/admin/semesters', icon: CalendarRange },
    { label: 'Kelas Paralel', to: '/admin/classes', icon: LayoutGrid },
    { label: 'Monitoring KHS', to: '/admin/transcripts', icon: FileText },
    { label: 'Jejak Audit', to: '/admin/audit-logs', icon: ScrollText },
  ],
  student: [
    { label: 'KRS', to: '/student/krs', icon: ClipboardList },
    { label: 'Jadwal Kuliah', to: '/student/schedule', icon: CalendarDays },
    { label: 'Presensi', to: '/student/attendance', icon: CheckSquare },
    { label: 'KHS', to: '/student/transcript', icon: GraduationCap },
  ],
  lecturer: [
    { label: 'Kelas Diampu', to: '/lecturer/classes', icon: Presentation },
  ],
}

export function Sidebar({ role, open, onClose, onLogout }) {
  const items = NAV_BY_ROLE[role] || []

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const content = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4338CA]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold tracking-tight text-[#4338CA]">
              SIASAT
            </span>
            <p className="text-[11px] text-[#64748B] leading-none">Portal Akademik</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu"
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#64748B] hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4338CA] rounded-xl font-semibold'
                    : 'text-[#64748B] hover:bg-slate-50 hover:text-[#1E293B] rounded-xl font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isActive && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#4F46E5] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#FFF1F2] hover:text-[#BE123C] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        {content}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full shadow-xl transition-transform">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
