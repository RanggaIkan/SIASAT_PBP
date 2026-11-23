import React from 'react'
import { CalendarDays, Menu } from 'lucide-react'

const ROLE_LABELS = {
  admin: 'Admin Akademik',
  lecturer: 'Dosen',
  student: 'Mahasiswa',
}

function getInitials(name) {
  if (!name) return 'U'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function Topbar({ title, user, activeSemester, semesterOverride, onOpenMenu }) {
  const role = user?.role
  const semester = semesterOverride || activeSemester

  const identityCode =
    user?.student?.student_number || user?.lecturer?.lecturer_number || null

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka menu navigasi"
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-[#1E293B] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && (
          <h1 className="font-heading text-base sm:text-lg font-semibold text-[#1E293B] truncate">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {semester && (
          <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-[#64748B]">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{semester.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 pl-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4338CA] text-xs font-semibold shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-semibold text-[#1E293B] leading-tight truncate max-w-[160px]">
              {user?.name || user?.username}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {role === 'student' ? (
                identityCode && (
                  <span className="font-mono text-[11px] text-[#64748B]">
                    {identityCode}
                  </span>
                )
              ) : (
                <>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">
                    {ROLE_LABELS[role] || role}
                  </span>
                  {identityCode && (
                    <span className="font-mono text-[11px] text-[#64748B]">
                      {identityCode}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
