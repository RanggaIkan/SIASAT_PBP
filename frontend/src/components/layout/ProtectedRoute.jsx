import React from 'react'
import { Navigate } from 'react-router-dom'
import { getRoleHomePath, useAuth } from '../../context/AuthContext'
import { Skeleton } from '../ui/Skeleton'

/**
 * Route guard checking authentication and optional role membership.
 */
export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  return children
}

export default ProtectedRoute
