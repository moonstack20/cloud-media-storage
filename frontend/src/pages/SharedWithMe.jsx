import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as sharesApi from '../api/shares'
import * as filesApi from '../api/files'

export default function SharedWithMe() {
  const { logout } = useAuth()
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    sharesApi.listSharedWithMe()
      .then((res) => setShares(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleOpen = async (share) => {
    if (share.resource_type === 'file') {
      try {
        const res = await filesApi.downloadFile(share.resource_id)
        window.open(res.data.download_url, '_blank')
      } catch (err) {
        console.error(err)
      }
    } else {
      navigate('/?folder=' + share.resource_id)
    }
  }

  return (
    <div className="min-h-screen bg-[#EAE3D0]">
      <header className="border-b border-[#1B2A41]/15 bg-[#F7F4EA] px-8 py-5 flex justify-between items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Vault</p>
          <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41]">Shared with me</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/" className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors">
            Back to Archive
          </Link>
          <button onClick={logout} className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#A63D40] transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-4xl mx-auto">
        {loading ? (
          <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-16">Loading…</p>
        ) : shares.length === 0 ? (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-16 text-center">
            <p className="font-[var(--font-display)] text-xl text-[#1B2A41]/70">Nothing shared with you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shares.map((s) => (
              <button
                key={s.id}
                onClick={() => handleOpen(s)}
                className="text-left bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-4 hover:shadow-[3px_3px_0_0_rgba(27,42,65,0.08)] transition-shadow"
              >
                <p className="font-medium text-[#1B2A41] mb-1 truncate">
                  {s.resource_type === 'folder' ? String.fromCharCode(9656) + ' ' : ''}{s.resource_name || 'Untitled'}
                </p>
                <p className="font-mono text-[11px] text-[#1B2A41]/50 uppercase">{s.resource_type} · {s.permission}</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
