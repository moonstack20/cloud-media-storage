import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as activityApi from '../api/activity'

const ACTION_LABELS = {
  upload: 'uploaded',
  download: 'downloaded',
  rename: 'renamed',
  delete: 'deleted',
  restore: 'restored',
  share: 'shared',
  upload_version: 'uploaded a new version of',
  restore_version: 'restored a previous version of',
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Activity() {
  const { logout } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    activityApi.getActivity()
      .then((res) => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#EAE3D0]">
      <header className="border-b border-[#1B2A41]/15 bg-[#F7F4EA] px-8 py-5 flex justify-between items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Vault</p>
          <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41]">Activity</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/" className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors">
            ← Back to Archive
          </Link>
          <button onClick={logout} className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#A63D40] transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-2xl mx-auto">
        {loading ? (
          <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-16">Loading activity…</p>
        ) : logs.length === 0 ? (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-16 text-center">
            <p className="font-[var(--font-display)] text-xl text-[#1B2A41]/70">No activity yet.</p>
          </div>
        ) : (
          <div className="relative border-l border-[#1B2A41]/15 ml-2">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-6 pb-6">
                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#B08D57]" />
                <p className="text-[#1B2A41]">
                  You <span className="font-medium">{ACTION_LABELS[log.action] || log.action}</span>{' '}
                  <span className="text-[#1B2A41]/80">"{log.resource_name}"</span>
                </p>
                <p className="font-mono text-[11px] text-[#1B2A41]/50 mt-0.5">{formatDate(log.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
