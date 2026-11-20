import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap, LogIn } from 'lucide-react'
import { getRoleHomePath, useAuth } from '../../context/AuthContext'
import { parseApiError } from '../../lib/apiError'
import {
  AlertBanner,
  Card,
  Field,
  LoadingButton,
  getControlClass,
} from '../../components/ui'

const DEMO_ACCOUNTS = [
  {
    key: 'admin',
    label: 'Admin',
    username: 'admin',
    password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'AdminSiasat123!',
  },
  {
    key: 'dosen1',
    label: 'Dosen 1',
    username: 'dosen1',
    password: import.meta.env.VITE_DEMO_PASSWORD || 'password123',
  },
  {
    key: 'student1',
    label: 'Mahasiswa 1 (Budi)',
    username: 'student1',
    password: import.meta.env.VITE_DEMO_PASSWORD || 'password123',
  },
  {
    key: 'student3',
    label: 'Mahasiswa 3 (Andi - KRS Baru)',
    username: 'student3',
    password: import.meta.env.VITE_DEMO_PASSWORD || 'password123',
  },
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeDemoKey, setActiveDemoKey] = useState(null)
  const [error, setError] = useState(null)
  const [lockSeconds, setLockSeconds] = useState(0)

  useEffect(() => {
    if (lockSeconds <= 0) return undefined
    const timer = window.setInterval(() => {
      setLockSeconds((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lockSeconds])

  if (user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />
  }

  const parsedError = error ? parseApiError(error) : null
  const fieldErrors = parsedError?.fieldErrors || {}

  const performLogin = async (creds, demoKey = null) => {
    if (lockSeconds > 0 || submitting) return
    setError(null)
    setSubmitting(true)
    setActiveDemoKey(demoKey)
    try {
      const loggedUser = await login(creds)
      navigate(getRoleHomePath(loggedUser?.role), { replace: true })
    } catch (err) {
      setError(err)
      if (err?.response?.status === 429) {
        setLockSeconds(60)
      }
    } finally {
      setSubmitting(false)
      setActiveDemoKey(null)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    return performLogin({ username: username.trim(), password })
  }

  const handleDemoLogin = (account) => {
    setUsername(account.username)
    setPassword(account.password)
    return performLogin(
      { username: account.username, password: account.password },
      account.key
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <Card className="p-6 sm:p-7" padding="p-0">
          <div className="p-6 sm:p-7 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4338CA]">
                <GraduationCap className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold text-[#1E293B]">
                  Masuk ke SIASAT
                </h1>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Sistem Informasi Akademik Terpadu
                </p>
              </div>
            </div>

            {error && <AlertBanner error={error} onDismiss={() => setError(null)} />}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field
                label="Username"
                htmlFor="login-username"
                error={fieldErrors.username?.[0]}
                required
              >
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  placeholder="Masukkan username"
                  className={getControlClass(Boolean(fieldErrors.username))}
                />
              </Field>

              <Field
                label="Kata sandi"
                htmlFor="login-password"
                error={fieldErrors.password?.[0]}
                required
              >
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    placeholder="Masukkan kata sandi"
                    className={getControlClass(Boolean(fieldErrors.password), 'pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[#64748B] hover:text-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 rounded-r-xl"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <LoadingButton
                type="submit"
                fullWidth
                icon={LogIn}
                loading={submitting && !activeDemoKey}
                disabled={submitting || lockSeconds > 0}
                loadingText="Memproses..."
              >
                {lockSeconds > 0 ? `Tunggu ${lockSeconds} dtk` : 'Masuk'}
              </LoadingButton>
            </form>
          </div>
        </Card>

        <Card padding="p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#64748B]">Akses Cepat Demo</p>
              <span className="font-mono text-[11px] text-[#64748B]">Sandbox</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <LoadingButton
                  key={acc.key}
                  variant="soft"
                  size="sm"
                  loading={submitting && activeDemoKey === acc.key}
                  disabled={submitting || lockSeconds > 0}
                  loadingText="Masuk..."
                  onClick={() => handleDemoLogin(acc)}
                  className="justify-start px-3"
                >
                  {acc.label}
                </LoadingButton>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
