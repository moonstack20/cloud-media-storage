import { useState, useEffect } from 'react'
import * as sharesApi from '../api/shares'

export default function ShareModal({ resource, onClose }) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('viewer')
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadShares = async () => {
    setLoading(true)
    try {
      const res = await sharesApi.listSharesForResource(resource.type, resource.id)
      setShares(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShares()
  }, [resource.id])

  const handleShare = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await sharesApi.shareResource(resource.type, resource.id, email, permission)
      setEmail('')
      await loadShares()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not share this file.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePermissionChange = async (shareId, newPermission) => {
    setShares((prev) => prev.map((s) => s.id === shareId ? { ...s, permission: newPermission } : s))
    try {
      await sharesApi.updateSharePermission(shareId, newPermission)
    } catch (err) {
      console.error(err)
      loadShares()
    }
  }

  const handleRevoke = async (shareId) => {
    try {
      await sharesApi.revokeShare(shareId)
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1B2A41]/40 flex items-center justify-center z-50 px-6">
      <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-xl max-w-md w-full">
        <div className="flex justify-between items-start p-6 border-b border-[#1B2A41]/10">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Share</p>
            <h2 className="font-[var(--font-display)] text-xl text-[#1B2A41] truncate max-w-xs">{resource.name}</h2>
          </div>
          <button onClick={onClose} className="text-[#1B2A41]/50 hover:text-[#1B2A41] text-xl leading-none">×</button>
        </div>

        <div className="p-6">
          <form onSubmit={handleShare} className="flex gap-2 mb-6">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] text-sm transition-colors"
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="bg-[#F7F4EA] border border-[#1B2A41]/20 rounded-sm px-2 text-sm text-[#1B2A41] outline-none"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1B2A41] text-[#EAE3D0] font-mono text-xs uppercase px-4 rounded-sm hover:bg-[#243a58] transition-colors disabled:opacity-50"
            >
              Share
            </button>
          </form>

          {error && <p className="text-[#A63D40] text-sm mb-4">{error}</p>}

          {loading ? (
            <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-4">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-[#1B2A41]/50">Not shared with anyone yet.</p>
          ) : (
            <div className="space-y-2">
              {shares.map((s) => (
                <div key={s.id} className="flex justify-between items-center text-sm">
                  <span className="text-[#1B2A41]/70 truncate">{s.shared_with_id}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.permission}
                      onChange={(e) => handlePermissionChange(s.id, e.target.value)}
                      className="bg-transparent font-mono text-xs uppercase text-[#1B2A41]/70 outline-none"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="font-mono text-[11px] uppercase text-[#A63D40]/70 hover:text-[#A63D40]"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
