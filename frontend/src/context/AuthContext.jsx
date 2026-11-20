import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import api, { TOKEN_KEY, USER_KEY, unwrapData, unwrapList } from '../lib/api'
import { useToast } from '../components/ui/Toast'

const AuthContext = createContext(null)

export function getRoleHomePath(role) {
  if (role === 'admin') return '/admin/students'
  if (role === 'student') return '/student/krs'
  if (role === 'lecturer') return '/lecturer/classes'
  return '/login'
}

export function AuthProvider({ children }) {
  const { showToast } = useToast()
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))
  const [activeSemester, setActiveSemester] = useState(null)
  const userRef = useRef(user)
  userRef.current = user

  const refreshSemester = useCallback(async (targetUser) => {
    const effectiveUser =
      targetUser !== undefined &&
      (targetUser === null || typeof targetUser?.role === 'string')
        ? targetUser
        : userRef.current
    const role = effectiveUser?.role
    if (role !== 'admin' && role !== 'student') {
      setActiveSemester((prev) => (prev === null ? prev : null))
      return null
    }
    try {
      const endpoint = role === 'admin' ? '/admin/semesters' : '/student/semesters'
      const res = await api.get(endpoint)
      const list = unwrapList(res)
      const active = list.find((s) => s.is_active) || list[0] || null
      setActiveSemester((prev) => {
        if (
          prev &&
          active &&
          prev.id === active.id &&
          prev.is_active === active.is_active &&
          prev.enrollment_start_at === active.enrollment_start_at &&
          prev.enrollment_end_at === active.enrollment_end_at &&
          prev.name === active.name
        ) {
          return prev
        }
        return active
      })
      return active
    } catch {
      return null
    }
  }, [])

  const bootstrap = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get('/auth/me')
      const payload = unwrapData(res)
      const me = payload?.user || payload
      userRef.current = me
      setUser(me)
      localStorage.setItem(USER_KEY, JSON.stringify(me))
      await refreshSemester(me)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      userRef.current = null
      setUser(null)
      setActiveSemester(null)
    } finally {
      setLoading(false)
    }
  }, [refreshSemester])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onUnauthorized = (e) => {
      userRef.current = null
      setUser(null)
      setActiveSemester(null)
      showToast(e?.detail?.message || 'Sesi Anda telah berakhir', 'info')
    }
    window.addEventListener('siasat:unauthorized', onUnauthorized)
    return () => window.removeEventListener('siasat:unauthorized', onUnauthorized)
  }, [showToast])

  const login = useCallback(
    async ({ username, password }) => {
      const res = await api.post('/auth/login', { username, password })
      const data = unwrapData(res)
      const token = data?.token
      const loggedUser = data?.user
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      }
      if (loggedUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(loggedUser))
        userRef.current = loggedUser
        setUser(loggedUser)
        await refreshSemester(loggedUser)
      }
      return loggedUser
    },
    [refreshSemester]
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout network/token errors when clearing session
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      userRef.current = null
      setUser(null)
      setActiveSemester(null)
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      activeSemester,
      setActiveSemester,
      refreshSemester,
      login,
      logout,
    }),
    [user, loading, activeSemester, refreshSemester, login, logout]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}

export default AuthContext
