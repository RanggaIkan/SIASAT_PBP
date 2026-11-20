import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import api, { unwrapList } from '../../lib/api'
import { formatWibDateTime } from '../../lib/datetime'
import {
  AlertBanner,
  Card,
  DataTable,
  LoadingButton,
  Modal,
  StatusBadge,
  getControlClass,
} from '../../components/ui'

const ACTION_LABELS = {
  published_grade_revised: 'Revisi Nilai Terpublikasi',
  attendance_session_reopened: 'Presensi Dibuka Ulang',
  user_deactivated: 'Akun Dinonaktifkan',
  semester_activated: 'Semester Diaktifkan',
  krs_period_updated: 'Periode KRS Diperbarui',
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/admin/audit-logs')
      setLogs(unwrapList(res))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filtered = useMemo(() => {
    const q = actionFilter.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((row) => {
      const action = String(row.action || '').toLowerCase()
      const friendly = String(ACTION_LABELS[row.action] || '').toLowerCase()
      const actor = String(row.user?.name || row.actor?.name || row.user_id || '').toLowerCase()
      const entity = String(row.entity_type || '').toLowerCase()
      return (
        action.includes(q) ||
        friendly.includes(q) ||
        actor.includes(q) ||
        entity.includes(q)
      )
    })
  }, [logs, actionFilter])

  const columns = [
    {
      key: 'created_at',
      label: 'Waktu (WIB)',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B] whitespace-nowrap">
          {formatWibDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'Pengguna',
      render: (row) => (
        <div>
          <p className="font-medium text-[#1E293B]">
            {row.user?.name || row.actor?.name || `User #${row.user_id ?? '—'}`}
          </p>
          {row.user?.username && (
            <p className="font-mono text-xs text-[#64748B]">@{row.user.username}</p>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Aksi',
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge
            tone="slate"
            label={ACTION_LABELS[row.action] || row.action || '—'}
          />
          {ACTION_LABELS[row.action] && (
            <p className="font-mono text-[11px] text-[#64748B]">{row.action}</p>
          )}
        </div>
      ),
    },
    {
      key: 'entity',
      label: 'Entitas',
      render: (row) => (
        <span className="font-mono text-[13px] text-[#1E293B]">
          {row.entity_type || '—'} #{row.entity_id ?? '—'}
        </span>
      ),
    },
    {
      key: 'detail',
      label: 'Detail',
      align: 'right',
      render: (row) => (
        <LoadingButton
          variant="secondary"
          size="sm"
          icon={Eye}
          onClick={() => setSelectedLog(row)}
        >
          Lihat
        </LoadingButton>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold text-[#1E293B]">
          Jejak Audit Aktivitas
        </h2>
        <p className="text-sm text-[#64748B]">
          Catatan aktivitas sensitif sistem (revisi nilai terpublikasi, buka ulang presensi, penonaktifan akun, perubahan semester).
        </p>
      </div>

      {error && <AlertBanner error={error} onDismiss={() => setError(null)} />}

      <Card padding="p-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action, pengguna, entitas..."
              className={getControlClass(false, 'pl-9')}
            />
          </div>
          <span className="text-xs text-[#64748B]">{filtered.length} catatan</span>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyDescription="Belum ada catatan audit."
        />
      </Card>

      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Detail Jejak Audit"
        size="lg"
        footer={
          <LoadingButton variant="secondary" onClick={() => setSelectedLog(null)}>
            Tutup
          </LoadingButton>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
              <div>
                <span className="text-[#64748B]">Aksi:</span>
                <p className="font-mono font-medium text-[#1E293B] mt-0.5">
                  {selectedLog.action}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">Waktu (WIB):</span>
                <p className="font-mono text-[#1E293B] mt-0.5">
                  {formatWibDateTime(selectedLog.created_at)}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">Pengguna:</span>
                <p className="font-medium text-[#1E293B] mt-0.5">
                  {selectedLog.user?.name || `User #${selectedLog.user_id ?? '—'}`}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">Entitas:</span>
                <p className="font-mono text-[#1E293B] mt-0.5">
                  {selectedLog.entity_type} #{selectedLog.entity_id}
                </p>
              </div>
            </div>

            {selectedLog.reason && (
              <div>
                <p className="text-xs font-medium text-[#64748B] mb-1">Alasan</p>
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-[#1E293B]">
                  {selectedLog.reason}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Nilai Sebelum (old_values)</p>
              <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono overflow-x-auto text-[#1E293B]">
                {JSON.stringify(selectedLog.old_values ?? null, null, 2)}
              </pre>
            </div>

            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Nilai Sesudah (new_values)</p>
              <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono overflow-x-auto text-[#1E293B]">
                {JSON.stringify(selectedLog.new_values ?? null, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AuditLogsPage
