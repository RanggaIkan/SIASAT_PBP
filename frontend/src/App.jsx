import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AuthProvider, getRoleHomePath, useAuth } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

import LoginPage from './pages/auth/LoginPage'
import StudentsPage from './pages/admin/StudentsPage'
import LecturersPage from './pages/admin/LecturersPage'
import CoursesPage from './pages/admin/CoursesPage'
import SemestersPage from './pages/admin/SemestersPage'
import ClassesPage from './pages/admin/ClassesPage'
import TranscriptMonitorPage from './pages/admin/TranscriptMonitorPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'

import KrsPage from './pages/student/KrsPage'
import SchedulePage from './pages/student/SchedulePage'
import AttendancePage from './pages/student/AttendancePage'
import TranscriptPage from './pages/student/TranscriptPage'

import LecturerClassesPage from './pages/lecturer/LecturerClassesPage'
import LecturerClassDetailPage from './pages/lecturer/LecturerClassDetailPage'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getRoleHomePath(user.role)} replace />
}

function RoleShell({ role, children }) {
  return (
    <ProtectedRoute role={role}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Admin routes */}
            <Route
              path="/admin/students"
              element={
                <RoleShell role="admin">
                  <StudentsPage />
                </RoleShell>
              }
            />
            <Route
              path="/admin/lecturers"
              element={
                <RoleShell role="admin">
                  <LecturersPage />
                </RoleShell>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <RoleShell role="admin">
                  <CoursesPage />
                </RoleShell>
              }
            />
            <Route
              path="/admin/semesters"
              element={
                <RoleShell role="admin">
                  <SemestersPage />
                </RoleShell>
              }
            />
            <Route
              path="/admin/classes"
              element={
                <RoleShell role="admin">
                  <ClassesPage />
                </RoleShell>
              }
            />
            <Route
              path="/admin/transcripts"
              element={
                <RoleShell role="admin">
                  <TranscriptMonitorPage />
                </RoleShell>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <RoleShell role="admin">
                  <AuditLogsPage />
                </RoleShell>
              }
            />

            {/* Student routes */}
            <Route
              path="/student/krs"
              element={
                <RoleShell role="student">
                  <KrsPage />
                </RoleShell>
              }
            />
            <Route
              path="/student/schedule"
              element={
                <RoleShell role="student">
                  <SchedulePage />
                </RoleShell>
              }
            />
            <Route
              path="/student/attendance"
              element={
                <RoleShell role="student">
                  <AttendancePage />
                </RoleShell>
              }
            />
            <Route
              path="/student/transcript"
              element={
                <RoleShell role="student">
                  <TranscriptPage />
                </RoleShell>
              }
            />

            {/* Lecturer routes */}
            <Route
              path="/lecturer/classes"
              element={
                <RoleShell role="lecturer">
                  <LecturerClassesPage />
                </RoleShell>
              }
            />
            <Route
              path="/lecturer/classes/:classId"
              element={
                <RoleShell role="lecturer">
                  <LecturerClassDetailPage />
                </RoleShell>
              }
            />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
